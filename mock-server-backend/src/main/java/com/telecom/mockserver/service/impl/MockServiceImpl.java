package com.telecom.mockserver.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.telecom.mockserver.dto.request.CreateMockRequestDto;
import com.telecom.mockserver.dto.request.UpdateMockRequestDto;
import com.telecom.mockserver.dto.response.MockDto;
import com.telecom.mockserver.dto.response.MockExecutionResult;
import com.telecom.mockserver.engine.*;
import com.telecom.mockserver.exception.BadRequestException;
import com.telecom.mockserver.exception.NotFoundException;
import com.telecom.mockserver.mapper.MockMapper;
import com.telecom.mockserver.model.*;
import com.telecom.mockserver.repository.MockJpaRepository;
import com.telecom.mockserver.repository.PermanentlyDeletedMockRepository;
import com.telecom.mockserver.repository.ProjectJpaRepository;

import com.telecom.mockserver.model.AuditAction;
import com.telecom.mockserver.service.EntityAuditLogService;
import com.telecom.mockserver.service.MockService;
import com.telecom.mockserver.util.JsonUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@Service
@RequiredArgsConstructor
@Slf4j
public class MockServiceImpl implements MockService {

    private static final int MIN_STATUS = 100;
    private static final int MAX_STATUS = 599;
    private static final int MAX_ENDPOINT_LENGTH = 512;
    private static final long MAX_DELAY_MS = 30_000L; // 30s safety cap
    private static final String REDIS_MOCK_KEY_PREFIX = "mock:endpoint:";

    private final MockJpaRepository mockRepository;
    private final RequestLogPersistenceService requestLogPersistenceService;
    private final MockRoutingEngine mockRoutingEngine;
    private final JsonUtils jsonUtils;
    private final DynamicTemplateEngine dynamicTemplateEngine;
    private final ProjectJpaRepository projectRepository;
    private final MockMapper mockMapper;
    private final MockCacheService mockCacheService;
    private final EntityAuditLogService entityAuditLogService;
    private final PermanentlyDeletedMockRepository permanentlyDeletedMockRepository;
    private final StringRedisTemplate stringRedisTemplate;
    private final ObjectMapper objectMapper;

    // =========================================================================
    //  REDIS PER-MOCK KEY MANAGEMENT
    // =========================================================================

    /**
     * Store a mock's endpoint in Redis with key = mock:endpoint:{id}
     * Value = JSON with method, endpoint, environment, statusCode
     */
    private void storeMockInRedis(Mock m) {
        try {
            String key = REDIS_MOCK_KEY_PREFIX + m.getId().toString();
            Map<String, String> value = new LinkedHashMap<>();
            value.put("id", m.getId().toString());
            value.put("method", m.getMethod().name());
            value.put("endpoint", m.getEndpoint());
            value.put("environment", m.getEnvironment().name());
            value.put("statusCode", String.valueOf(m.getStatusCode()));
            value.put("projectId", m.getProjectId() != null ? m.getProjectId().toString() : "");
            stringRedisTemplate.opsForHash().putAll(key, value);
            log.debug("Redis: stored mock key={}", key);
        } catch (Exception e) {
            log.warn("Redis: failed to store mock {}: {}", m.getId(), e.getMessage());
        }
    }

    private void removeMockFromRedis(UUID mockId) {
        try {
            String key = REDIS_MOCK_KEY_PREFIX + mockId.toString();
            stringRedisTemplate.delete(key);
            log.debug("Redis: removed mock key={}", key);
        } catch (Exception e) {
            log.warn("Redis: failed to remove mock {}: {}", mockId, e.getMessage());
        }
    }

    // =========================================================================
    //  CRUD
    // =========================================================================

    @Override
    @Transactional
    public MockDto createMock(CreateMockRequestDto req) {
        log.debug("Creating mock: {} {}", req.getMethod(), req.getEndpoint());
        Mock m = buildMock(UUID.randomUUID(), req);

        // Duplicate check: method + endpoint + environment must be unique
        if (mockRepository.existsByMethodAndEndpointAndEnvironment(
                m.getMethod(), m.getEndpoint(), m.getEnvironment())) {
            throw new BadRequestException(
                    "Mock already exists for " + m.getMethod() + " " + m.getEndpoint()
                            + " [env=" + m.getEnvironment() + "]. "
                            + "Use update (PUT) to modify the existing mock.");
        }

        mockRepository.save(m);
        deferCacheEviction();

        // Store in Redis per-mock
        storeMockInRedis(m);

        entityAuditLogService.recordWithDetails(
                "MOCK", m.getId().toString(), AuditAction.CREATE,
                m.getMethod() + " " + m.getEndpoint() + " [" + m.getEnvironment() + "]",
                m.getEndpoint(),
                m.getRequestBody(),
                m.getResponseBody(),
                resolveProjectName(m.getProjectId())
        );
        log.info("Mock created: id={}, {} {}", m.getId(), m.getMethod(), m.getEndpoint());
        return mockMapper.toDto(m);
    }

    @Override
    @Transactional(readOnly = true)
    public List<MockDto> listMocks() {
        // Use ordered query — latest routes appear consistently
        return mockRepository.findAllOrdered().stream()
                .map(mockMapper::toDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<MockDto> listMocksForProject(UUID projectId) {
        return mockRepository.findByProjectIdOrdered(projectId).stream()
                .map(mockMapper::toDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<MockDto> listMocksForEnvironment(Environment env) {
        return mockRepository.findAllOrdered().stream()
                .filter(m -> m.getEnvironment() == env)
                .map(mockMapper::toDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<MockDto> listDeletedMocks() {
        return mockRepository.findDeletedMocksNative().stream()
                .map(mockMapper::toDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<MockDto> searchMocks(String query) {
        String q = query == null ? "" : query.trim().toLowerCase();
        return mockRepository.findAllOrdered().stream()
                .filter(m -> {
                    String ep  = Optional.ofNullable(m.getEndpoint()).orElse("").toLowerCase();
                    String met = Optional.ofNullable(m.getMethod()).map(Enum::name).orElse("").toLowerCase();
                    String des = Optional.ofNullable(m.getDescription()).orElse("").toLowerCase();
                    String tc  = Optional.ofNullable(m.getTestCase()).orElse("").toLowerCase();
                    return ep.contains(q) || met.contains(q) || des.contains(q) || tc.contains(q);
                })
                .map(mockMapper::toDto).collect(Collectors.toList());
    }

    @Override
    @Transactional
    public MockDto updateMock(UUID id, UpdateMockRequestDto req) {
        if (!mockRepository.existsById(id)) throw new NotFoundException("Mock not found: " + id);
        log.debug("Updating mock: id={}", id);
        Mock m = buildMock(id, req);

        // Duplicate check on update: exclude self
        if (mockRepository.existsDuplicate(m.getMethod(), m.getEndpoint(), m.getEnvironment(), id)) {
            throw new BadRequestException(
                    "Another mock already exists for " + m.getMethod() + " " + m.getEndpoint()
                            + " [env=" + m.getEnvironment() + "].");
        }

        mockRepository.save(m);
        deferCacheEviction();

        // Update in Redis
        storeMockInRedis(m);

        entityAuditLogService.recordWithDetails(
                "MOCK", m.getId().toString(), AuditAction.UPDATE,
                m.getMethod() + " " + m.getEndpoint() + " [" + m.getEnvironment() + "]",
                m.getEndpoint(),
                m.getRequestBody(),
                m.getResponseBody(),
                resolveProjectName(m.getProjectId())
        );
        log.info("Mock updated: id={}, {} {}", m.getId(), m.getMethod(), m.getEndpoint());
        return mockMapper.toDto(m);
    }

    @Override
    @Transactional
    public void deleteMock(UUID id) {
        if (!mockRepository.existsById(id)) throw new NotFoundException("Mock not found: " + id);
        // This will call the @SQLDelete native query behind the scenes (soft delete)
        mockRepository.deleteById(id);
        deferCacheEviction();

        // Remove from Redis (soft-deleted, should not be in active cache)
        removeMockFromRedis(id);

        entityAuditLogService.record("MOCK", id.toString(), AuditAction.DELETE, "soft-delete → moved to trash");
        log.info("Mock soft-deleted: id={}", id);
    }

    @Override
    @Transactional
    public void recoverMock(UUID id) {
        // Get mock details before recovery for Redis storage
        Optional<Mock> deletedMock = mockRepository.findDeletedMockById(id.toString());

        mockRepository.recoverMockNative(id.toString());
        deferCacheEviction();

        // Re-add to Redis after recovery
        deletedMock.ifPresent(this::storeMockInRedis);

        entityAuditLogService.record("MOCK", id.toString(), AuditAction.RECOVER, "restored from trash");
        log.info("Mock recovered: id={}", id);
    }

    @Override
    @Transactional
    public void permanentlyDeleteMock(UUID id) {
        // 1. Find the soft-deleted mock (bypassing @SQLRestriction)
        Mock mock = mockRepository.findDeletedMockById(id.toString())
                .orElseThrow(() -> new NotFoundException(
                        "Mock not found in trash: " + id + ". Only soft-deleted mocks can be permanently deleted."));

        // 2. Archive to permanently_deleted_mocks table (stored in PG, never fetchable via API)
        String fullSnapshot = "{}";
        try {
            fullSnapshot = objectMapper.writeValueAsString(mockMapper.toDto(mock));
        } catch (Exception e) {
            log.warn("Failed to serialize mock snapshot for archival: {}", e.getMessage());
        }

        permanentlyDeletedMockRepository.save(PermanentlyDeletedMock.builder()
                .originalMockId(mock.getId().toString())
                .endpoint(mock.getEndpoint())
                .method(mock.getMethod() != null ? mock.getMethod().name() : "UNKNOWN")
                .projectId(mock.getProjectId() != null ? mock.getProjectId().toString() : null)
                .requestBody(mock.getRequestBody())
                .responseBody(mock.getResponseBody())
                .statusCode(mock.getStatusCode())
                .contentType(mock.getContentType())
                .environment(mock.getEnvironment() != null ? mock.getEnvironment().name() : null)
                .testCase(mock.getTestCase())
                .description(mock.getDescription())
                .deletedAt(Instant.now())
                .fullSnapshot(fullSnapshot)
                .build());

        // 3. Hard delete from all tables (collection tables first, then main table)
        String idStr = id.toString();
        mockRepository.hardDeleteHeaders(idStr);
        mockRepository.hardDeleteQueryParams(idStr);
        mockRepository.hardDeleteResponseHeaders(idStr);
        mockRepository.hardDeleteById(idStr);

        deferCacheEviction();

        // 4. Remove from Redis
        removeMockFromRedis(id);

        // 5. Record audit with full details
        entityAuditLogService.recordWithDetails(
                "MOCK", id.toString(), AuditAction.PERMANENT_DELETE,
                "PERMANENTLY DELETED: " + (mock.getMethod() != null ? mock.getMethod().name() : "") + " " + mock.getEndpoint(),
                mock.getEndpoint(),
                mock.getRequestBody(),
                mock.getResponseBody(),
                resolveProjectName(mock.getProjectId())
        );

        log.info("Mock PERMANENTLY deleted: id={}, {} {}", id,
                mock.getMethod() != null ? mock.getMethod().name() : "?",
                mock.getEndpoint());
    }

    private void deferCacheEviction() {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    mockCacheService.evictMockCache();
                }
            });
        } else {
            mockCacheService.evictMockCache();
        }
    }

    // =========================================================================
    //  EXECUTION
    // =========================================================================

    @Override
    @Transactional
    public MockExecutionResult execute(
            String requestPath,
            HttpMethodType requestMethod,
            Map<String, String> queryParams,
            Map<String, String> headersLower,
            JsonNode requestBody,
            Environment environment
    ) {
        log.debug("▶ execute() called: {} {} [env={}]", requestMethod, requestPath, environment);

        // Fetch mocks from Caffeine cache — zero DB hit on warm cache
        List<Mock> candidates = mockCacheService.getCachedMocks();
        log.debug("  Total mocks in DB: {}", candidates.size());

        Optional<MockMatch> match = mockRoutingEngine.findBestMatchV2(
                candidates, requestPath, requestMethod,
                queryParams, headersLower, requestBody, environment);

        Instant now = Instant.now();

        if (match.isEmpty()) {
            log.info("✗ No mock matched: {} {} [env={}]", requestMethod, requestPath, environment);

            // Log unmatched request — isolated transaction so it always commits
            saveRequestLogSafe(requestPath, requestMethod, queryParams, headersLower,
                    requestBody, now, null, null, null, false);

            // NEVER return empty — always return a guaranteed 404 response
            String notFoundJson = String.format(
                    "{\"status\":404,\"message\":\"No mock matched\",\"path\":\"%s\"}",
                    requestPath.replace("\"", "\\\""));
            JsonNode notFoundBody = jsonUtils.parseToJsonNode(notFoundJson);
            return MockExecutionResult.builder()
                    .endpoint(requestPath)
                    .method(requestMethod.name())
                    .timestamp(now)
                    .environment(environment)
                    .statusCode(404)
                    .contentType("application/json")
                    .responseBody(notFoundBody)
                    .build();
        }

        Mock mock = match.get().getMock();
        log.info("✓ Mock matched: {} {} → mockId={} (score={})",
                requestMethod, requestPath, mock.getId(), match.get().getScore());

        // Apply delay with safety cap
        long delayMs = Optional.ofNullable(mock.getDelayMs()).orElse(0L);
        if (delayMs > 0) {
            delayMs = Math.min(delayMs, MAX_DELAY_MS); // prevent infinite wait
            log.debug("  Applying delay: {}ms", delayMs);
            try { TimeUnit.MILLISECONDS.sleep(delayMs); }
            catch (InterruptedException e) { Thread.currentThread().interrupt(); }
        }

        // Build response
        JsonNode resolvedBody = resolveResponseBody(mock, match.get(), queryParams, headersLower, requestBody);
        int statusCode = mock.getStatusCode();

        MockExecutionResult result = MockExecutionResult.builder()
                .matchedMockId(mock.getId())
                .endpoint(mock.getEndpoint())
                .method(mock.getMethod().name())
                .timestamp(now)
                .environment(mock.getEnvironment())
                .statusCode(statusCode)
                .headers(mock.getHeaders() == null ? null : new HashMap<>(mock.getHeaders()))
                .responseHeaders(mock.getResponseHeaders() == null ? null : new HashMap<>(mock.getResponseHeaders()))
                .contentType(mock.getContentType())
                .responseBody(resolvedBody)
                .build();

        log.debug("  Response built: status={}, contentType={}", statusCode, mock.getContentType());

        // Log matched request — isolated transaction so it always commits
        String responseBodyStr = resolvedBody != null ? resolvedBody.toString() : null;
        saveRequestLogSafe(requestPath, requestMethod, queryParams, headersLower,
                requestBody, now, mock.getId(), responseBodyStr, statusCode, true);

        return result;
    }

    // =========================================================================
    //  REQUEST LOGGING — Always commits, even if outer transaction rolls back
    // =========================================================================

    /**
     * Wrapper that catches ALL exceptions so request never breaks due to logging.
     * Delegates to RequestLogPersistenceService which runs in REQUIRES_NEW transaction.
     */
    private void saveRequestLogSafe(
            String endpoint,
            HttpMethodType method,
            Map<String, String> queryParams,
            Map<String, String> headers,
            JsonNode requestBody,
            Instant timestamp,
            UUID matchedMockId,
            String responseBody,
            Integer responseStatusCode,
            boolean matched
    ) {
        try {
            RequestLog logEntry = RequestLog.builder()
                    .endpoint(endpoint)
                    .method(method.name())
                    .timestamp(timestamp)
                    .matchedMockId(matchedMockId)
                    .requestHeaders(jsonUtils.toJsonString(headers))
                    .requestBody(requestBody != null ? requestBody.toString() : null)
                    .queryParams(jsonUtils.toJsonString(queryParams))
                    .responseBody(responseBody)
                    .responseStatusCode(responseStatusCode)
                    .matched(matched)
                    .build();
            // Separate service = separate Spring proxy = REQUIRES_NEW actually works
            requestLogPersistenceService.persist(logEntry);
        } catch (Exception e) {
            // NEVER let logging failure crash the request
            log.error("Failed to save request log for {} {}: {}", method, endpoint, e.getMessage(), e);
        }
    }

    // =========================================================================
    //  RESPONSE RESOLUTION
    // =========================================================================

    private JsonNode resolveResponseBody(
            Mock mock, MockMatch match,
            Map<String, String> queryParams,
            Map<String, String> headersLower,
            JsonNode requestBody
    ) {
        if (mock.getResponseBody() == null || mock.getResponseBody().isBlank()) {
            return jsonUtils.parseToJsonNode("{}");
        }

        RequestContext ctx = RequestContext.builder()
                .pathParams(match.getPathParams())
                .queryParams(queryParams)
                .headersLower(headersLower)
                .requestBody(requestBody)
                .build();

        try {
            JsonNode template = jsonUtils.parseToJsonNode(mock.getResponseBody());
            JsonNode resolved = dynamicTemplateEngine.applyToJson(template, ctx);
            log.debug("  Response body resolved successfully");
            return resolved;
        } catch (Exception e) {
            log.warn("Response resolution failed for mockId={}: {}", mock.getId(), e.getMessage());
            // Fallback: return the raw response body as-is
            try {
                return jsonUtils.parseToJsonNode(mock.getResponseBody());
            } catch (Exception fallbackEx) {
                log.error("Fallback response parsing also failed: {}", fallbackEx.getMessage());
                return jsonUtils.parseToJsonNode("{}");
            }
        }
    }

    // =========================================================================
    //  BUILDER
    // =========================================================================

    private Mock buildMock(UUID id, CreateMockRequestDto req) {

        UUID projectId = resolveProjectId(req.getProjectId());

        // Validate method
        if (req.getMethod() == null) {
            throw new BadRequestException("method is required (GET, POST, PUT, PATCH, DELETE)");
        }

        // Validate endpoint length
        String endpoint = normalizeEndpoint(req.getEndpoint());
        if (endpoint.length() > MAX_ENDPOINT_LENGTH) {
            throw new BadRequestException("endpoint is too long (max " + MAX_ENDPOINT_LENGTH + " characters)");
        }

        if (req.getStatusCode() < MIN_STATUS || req.getStatusCode() > MAX_STATUS) {
            throw new BadRequestException("Invalid statusCode: " + req.getStatusCode());
        }

        // Validate and parse response body (null-safe now)
        String responseBodyRaw = req.getResponseBody();
        if (responseBodyRaw == null || responseBodyRaw.isBlank()) {
            responseBodyRaw = "{}";
        }
        JsonNode responseJson = jsonUtils.parseToJsonNode(responseBodyRaw);

        // Pick delay from either field (frontend sends "delay" as int)
        long delayMs = 0L;
        if (req.getDelayMs() != null && req.getDelayMs() > 0) {
            delayMs = req.getDelayMs();
        } else if (req.getDelay() != null && req.getDelay() > 0) {
            delayMs = req.getDelay().longValue();
        }

        Environment env = req.getEnvironment() != null ? req.getEnvironment() : Environment.DEV;

        return Mock.builder()
                .id(id)
                .endpoint(endpoint)
                .method(req.getMethod())
                .projectId(projectId)
                .requestBody(req.getRequestBody())
                .responseBody(responseJson.toString())
                .statusCode(req.getStatusCode())
                .headers(buildMap(req.getHeadersList(), req.getHeaders()))
                .queryParams(buildMap(req.getQueryList(), req.getQueryParams()))
                .responseHeaders(buildMap(req.getResponseHeadersList(), req.getResponseHeaders()))
                .delayMs(delayMs)
                .contentType(
                        req.getContentType() != null && !req.getContentType().isBlank()
                                ? req.getContentType() : "application/json")
                .isTemp(Boolean.TRUE.equals(req.getIsTemp()))
                .toggleResponse(Boolean.TRUE.equals(req.getToggleResponse()))
                .environment(env)
                .testCase(req.getTestCase())
                .description(req.getDescription())
                .build();
    }

    /**
     * Convert [{key, value, dynamic}] list → flat Map<String,String>.
     * Falls back to plain map if list is null/empty.
     * If dynamic=true, prefixes value with $ so engine can resolve it.
     */
    private Map<String, String> buildMap(
            List<Map<String, Object>> list,
            Map<String, String> fallback
    ) {
        if (list != null && !list.isEmpty()) {
            Map<String, String> out = new LinkedHashMap<>();
            for (Map<String, Object> row : list) {
                if (row == null) continue;
                Object keyObj = row.get("key");
                if (keyObj == null) continue;
                String key = String.valueOf(keyObj).trim();
                if (key.isBlank()) continue;
                String val = row.get("value") == null ? "" : String.valueOf(row.get("value"));
                boolean dynamic = Boolean.TRUE.equals(row.get("dynamic"));
                if (dynamic && !val.startsWith("$")) val = "$" + val;
                out.put(key, val);
            }
            return out.isEmpty() ? null : out;
        }
        return (fallback != null && !fallback.isEmpty()) ? fallback : null;
    }

    private UUID resolveProjectId(UUID requested) {
        if (requested == null) {
            if (projectRepository.count() == 0) {
                Project def = Project.builder().id(UUID.randomUUID()).name("Default").build();
                projectRepository.save(def);
            }
            return projectRepository.findAll().stream()
                    .findFirst().map(Project::getId)
                    .orElseThrow(() -> new BadRequestException("No project found. Create one first."));
        }
        if (!projectRepository.existsById(requested)) {
            throw new BadRequestException("Invalid projectId: " + requested);
        }
        return requested;
    }

    private String resolveProjectName(UUID projectId) {
        if (projectId == null) return null;
        return projectRepository.findById(projectId)
                .map(Project::getName)
                .orElse(null);
    }

    private String normalizeEndpoint(String ep) {
        if (ep == null || ep.isBlank()) throw new BadRequestException("endpoint is required");
        String normalized = ep.trim();
        normalized = normalized.startsWith("/") ? normalized : "/" + normalized;
        // Convert Express-style params (:id) to Spring AntPathMatcher params ({id})
        return normalized.replaceAll(":([a-zA-Z0-9_]+)", "{$1}");
    }
}
