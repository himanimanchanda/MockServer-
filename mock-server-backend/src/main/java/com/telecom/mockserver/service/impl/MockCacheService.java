package com.telecom.mockserver.service.impl;

import com.telecom.mockserver.model.Mock;
import com.telecom.mockserver.repository.MockJpaRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Centralized mock cache service.
 *
 * All mock reads for routing go through getCachedMocks() which is backed
 * by Caffeine in-memory cache. CRUD operations call evictMockCache() to invalidate.
 *
 * This eliminates the #1 scaling bottleneck: hitting the DB on every
 * incoming mock request.
 *
 * CRITICAL FIX: Collections (headers, queryParams, responseHeaders) are LAZY-loaded.
 * We MUST initialize them within the @Transactional boundary before they get cached.
 * Otherwise, accessing them after the Hibernate session closes throws
 * LazyInitializationException → 500 error on cached requests.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class MockCacheService {

    private final MockJpaRepository mockRepository;

    /**
     * Returns all mocks ordered for routing, served from Caffeine cache.
     * Cache key is fixed ("all") since we cache the entire mock list.
     *
     * IMPORTANT: We force-initialize all LAZY @ElementCollection maps
     * inside this @Transactional method so they survive outside the session.
     */
    @Cacheable(value = "allMocksOrdered", key = "'all'")
    @Transactional(readOnly = true)
    public List<Mock> getCachedMocks() {
        log.info("Cache MISS — loading all mocks from database");
        List<Mock> mocks = mockRepository.findAllOrdered();

        // CRITICAL FIX: Hibernate proxies and PersistentMap collections will throw 
        // LazyInitializationException if deserialized from Redis (due to Jackson default typing 
        // storing the Hibernate class names). We MUST create completely clean POJO copies.
        List<Mock> cleanMocks = mocks.stream().map(m -> Mock.builder()
                .id(m.getId())
                .endpoint(m.getEndpoint())
                .method(m.getMethod())
                .projectId(m.getProjectId())
                .requestBody(m.getRequestBody())
                .responseBody(m.getResponseBody())
                .statusCode(m.getStatusCode())
                .headers(m.getHeaders() == null ? null : new java.util.HashMap<>(m.getHeaders()))
                .queryParams(m.getQueryParams() == null ? null : new java.util.HashMap<>(m.getQueryParams()))
                .responseHeaders(m.getResponseHeaders() == null ? null : new java.util.HashMap<>(m.getResponseHeaders()))
                .delayMs(m.getDelayMs())
                .contentType(m.getContentType())
                .isTemp(m.getIsTemp())
                .toggleResponse(m.getToggleResponse())
                .environment(m.getEnvironment())
                .testCase(m.getTestCase())
                .description(m.getDescription())
                .isDeleted(m.isDeleted())
                .createdAt(m.getCreatedAt())
                .updatedAt(m.getUpdatedAt())
                .createdBy(m.getCreatedBy())
                .updatedBy(m.getUpdatedBy())
                .build()).toList();

        log.info("Loaded {} mocks into cache (collections detached & unwrapped)", cleanMocks.size());
        return cleanMocks;
    }

    /**
     * Evicts the mock cache. Called after any create/update/delete.
     * Uses explicit key='all' because allEntries=true can be unreliable.
     */
    @CacheEvict(value = "allMocksOrdered", key = "'all'")
    public void evictMockCache() {
        log.info("Mock cache evicted (key='all')");
    }
}
