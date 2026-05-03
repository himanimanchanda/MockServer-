package com.telecom.mockserver.service.impl;

import com.telecom.mockserver.model.RequestLog;
import com.telecom.mockserver.repository.RequestLogJpaRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Dedicated service for persisting request logs ASYNCHRONOUSLY in an INDEPENDENT transaction.
 * 
 * WHY SEPARATE CLASS:
 * Spring's @Transactional proxy only works on calls from OUTSIDE the class.
 * If persistRequestLog() lived inside MockServiceImpl, the REQUIRES_NEW
 * propagation would be silently ignored, and logs would share (and die with)
 * the parent transaction. Extracting it here guarantees an independent commit.
 *
 * WHY @Async:
 * Request logging is non-critical — it must never slow down mock response times.
 * Using the dedicated "loggingExecutor" thread pool, DB writes happen off the
 * request thread, reducing P99 latency under load.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class RequestLogPersistenceService {

    private final RequestLogJpaRepository requestLogRepository;

    /**
     * Persists a RequestLog entry asynchronously in its own transaction.
     * Even if the caller's transaction rolls back, this log will survive.
     */
    @Async("loggingExecutor")
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void persist(RequestLog logEntry) {
        requestLogRepository.save(logEntry);
        log.debug("  Request log persisted: endpoint={}, matched={}",
                logEntry.getEndpoint(), logEntry.getMatched());
    }
}
