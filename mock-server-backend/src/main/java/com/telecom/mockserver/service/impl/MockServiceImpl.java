package com.telecom.mockserver.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.telecom.mockserver.dao.MockDao;
import com.telecom.mockserver.dao.ProjectDao;
import com.telecom.mockserver.dto.request.CreateMockRequestDto;
import com.telecom.mockserver.dto.request.UpdateMockRequestDto;
import com.telecom.mockserver.dto.response.MockDto;
import com.telecom.mockserver.dto.response.MockExecutionResult;
import com.telecom.mockserver.engine.*;
import com.telecom.mockserver.exception.BadRequestException;
import com.telecom.mockserver.exception.NotFoundException;
import com.telecom.mockserver.mapper.MockMapper;
import com.telecom.mockserver.model.*;

import com.telecom.mockserver.service.AuditService;
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

/**
 * Optimized mock service implementation.
 *
 * <p><b>Key changes from v1:</b></p>
 * <ul>
 *   <li>Uses DAO layer (MockDao, ProjectDao) instead of direct repository access</li>
 *   <li>Permanent delete uses flag ({@code is_permanently_deleted}) instead of
 *       archiving to a separate table + hard-deleting from 4 tables</li>
 *   <li>Request logging removed (use audit trail for observability)</li>
 *   <li>Cache eviction is deferred until after transaction commit</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class MockServiceImpl implements MockService {

    private static final int MIN_STATUS = 100;
    private static final int MAX_STATUS = 599;
    private static final int MAX_ENDPOINT_LENGTH = 512;
    private static final long MAX_DELAY_MS = 30_000L; // 30s safety cap
    private static final String REDIS_MOCK_KEY_PREFIX = "mock:endpoint:";

    private final MockDao mockDao;
    private final ProjectDao projectDao;
    private final MockRoutingEngine mockRoutingEngine;
    private final JsonUtils jsonUtils;
    private final DynamicTemplateEngine dynamicTemplateEngine;
    private final MockMapper mockMapper;
    private final MockCacheService mockCacheService;
    private final AuditService auditService;
    private final StringRedisTemplate stringRedisTemplate;

    // =========================================================================
    //  REDIS PER-MOCK KEY MANAGEMENT
    // =========================================================================

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
        if (mockDao.existsByMethodAndEndpointAndEnvironment(
                m.getMethod(), m.getEndpoint(), m.getEnvironment())) {
            throw new BadRequestException(
                    "Mock already exists for " + m.getMethod() + " " + m.getEndpoint()
                            + " [env=" + m.getEnvironment() + "]. "
                            + "Use update (PUT) to modify the existing mock.");
        }

        mockDao.save(m);
        deferCacheEviction();

        // Store in Redis per-mock
        storeMockInRedis(m);

        auditService.recordWithDetails(
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
        return mockDao.findAllOrdered().stream()
                .map(mockMapper::toDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<MockDto> listMocksForProject(UUID projectId) {
        return mockDao.findByProjectIdOrdered(projectId).stream()
                .map(mockMapper::toDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<MockDto> listMocksForEnvironment(Environment env) {
        return mockDao.findAllOrdered().stream()
                .filter(m -> m.getEnvironment() == env)
                .map(mockMapper::toDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<MockDto> listDeletedMocks() {
        return mockDao.findDeletedMocksNative().stream()
                .map(mockMapper::toDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<MockDto> searchMocks(String query) {
        String q = query == null ? "" : query.trim().toLowerCase();
        return mockDao.findAllOrdered().stream()
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
        if (mockDao.findById(id).isEmpty()) throw new NotFoundException("Mock not found: " + id);
        log.debug("Updating mock: id={}", id);
        Mock m = buildMock(id, req);

        // Duplicate check on update: exclude self
        if (mockDao.existsDuplicate(m.getMethod(), m.getEndpoint(), m.getEnvironment(), id)) {
            throw new BadRequestException(
                    "Another mock already exists for " + m.getMethod() + " " + m.getEndpoint()
                            + " [env=" + m.getEnvironment() + "].");
        }

        mockDao.save(m);
        deferCacheEviction();

        // Update in Redis
        storeMockInRedis(m);

        auditService.recordWithDetails(
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
        if (mockDao.findById(id).isEmpty()) throw new NotFoundException("Mock not found: " + id);
        mockDao.save(mockDao.findById(id).map(m -> { m.setDeleted(true); return m; }).get());
        deferCacheEviction();

        // Remove from Redis
        removeMockFromRedis(id);

        auditService.record("MOCK", id.toString(), AuditAction.DELETE, "soft-delete → moved to trash");
        log.info("Mock soft-deleted: id={}", id);
    }

    @Override
    @Transactional
    public void recoverMock(UUID id) {
        Optional<Mock> deletedMock = mockDao.findDeletedMockById(id.toString());

        mockDao.recoverMockNative(id.toString());
        deferCacheEviction();

        // Re-add to Redis after recovery
        deletedMock.ifPresent(this::storeMockInRedis);

        auditService.record("MOCK", id.toString(), AuditAction.RECOVER, "restored from trash");
        log.info("Mock recovered: id={}", id);
    }

    /**
     * Permanent delete — sets is_permanently_deleted flag.
     * Data stays in the database forever for compliance, but is excluded from all queries.
     * No more hard-delete + archive to separate table.
     */
    @Override
    @Transactional
    public void permanentlyDeleteMock(UUID id) {
        Mock mock = mockDao.findDeletedMockById(id.toString())
                .orElseThrow(() -> new NotFoundException(
                        "Mock not found in trash: " + id + ". Only soft-deleted mocks can be permanently deleted."));

        // Simply flag as permanently deleted — data stays in DB forever
        mockDao.permanentlyDeleteById(id.toString());

        deferCacheEviction();
        removeMockFromRedis(id);

        auditService.recordWithDetails(
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

    /**
     * Defers cache eviction until after the transaction commits.
     * This prevents other threads from reading stale cache between
     * eviction and commit.
     */
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
        log.debug("  Total mocks in cache: {}", candidates.size());

        Optional<MockMatch> match = mockRoutingEngine.findBestMatchV2(
                candidates, requestPath, requestMethod,
                queryParams, headersLower, requestBody, environment);

        Instant now = Instant.now();

        if (match.isEmpty()) {
            log.info("✗ No mock matched: {} {} [env={}]", requestMethod, requestPath, environment);

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
            delayMs = Math.min(delayMs, MAX_DELAY_MS);
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
        return result;
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

        if (req.getMethod() == null) {
            throw new BadRequestException("method is required (GET, POST, PUT, PATCH, DELETE)");
        }

        String endpoint = normalizeEndpoint(req.getEndpoint());
        if (endpoint.length() > MAX_ENDPOINT_LENGTH) {
            throw new BadRequestException("endpoint is too long (max " + MAX_ENDPOINT_LENGTH + " characters)");
        }

        if (req.getStatusCode() < MIN_STATUS || req.getStatusCode() > MAX_STATUS) {
            throw new BadRequestException("Invalid statusCode: " + req.getStatusCode());
        }

        String responseBodyRaw = req.getResponseBody();
        if (responseBodyRaw == null || responseBodyRaw.isBlank()) {
            responseBodyRaw = "{}";
        }
        JsonNode responseJson = jsonUtils.parseToJsonNode(responseBodyRaw);

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
            if (projectDao.count() == 0) {
                Project def = Project.builder().id(UUID.randomUUID()).name("Default").createdBy("system").build();
                projectDao.save(def);
            }
            return projectDao.findAll().stream()
                    .findFirst().map(Project::getId)
                    .orElseThrow(() -> new BadRequestException("No project found. Create one first."));
        }
        if (!projectDao.existsById(requested)) {
            throw new BadRequestException("Invalid projectId: " + requested);
        }
        return requested;
    }

    private String resolveProjectName(UUID projectId) {
        if (projectId == null) return null;
        return projectDao.findById(projectId)
                .map(Project::getName)
                .orElse(null);
    }

    private String normalizeEndpoint(String ep) {
        if (ep == null || ep.isBlank()) throw new BadRequestException("endpoint is required");
        String normalized = ep.trim();
        normalized = normalized.startsWith("/") ? normalized : "/" + normalized;
        return normalized.replaceAll(":([a-zA-Z0-9_]+)", "{$1}");
    }
}
