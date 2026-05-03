package com.telecom.mockserver.config;

import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.concurrent.ConcurrentMapCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

/**
 * Lightweight in-memory cache for {@code test} profile (no Redis needed in CI/unit runs).
 */
@Configuration
@EnableCaching
@Profile("test")
public class TestSimpleCacheConfig {

    @Bean
    CacheManager cacheManager() {
        return new ConcurrentMapCacheManager("allMocksOrdered");
    }
}
