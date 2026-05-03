package com.telecom.mockserver.service.impl;

import com.telecom.mockserver.dto.response.LogEntryDto;
import com.telecom.mockserver.mapper.LogMapper;
import com.telecom.mockserver.model.RequestLog;
import com.telecom.mockserver.repository.RequestLogJpaRepository;
import com.telecom.mockserver.service.LogService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class LogServiceImpl implements LogService {

    private final RequestLogJpaRepository requestLogRepository;
    private final LogMapper logMapper;

    @Override
    @Transactional(readOnly = true)
    public List<LogEntryDto> listLogs(int limit) {
        int safeLimit = Math.max(0, Math.min(limit, 5000));
        log.debug("Fetching latest {} logs", safeLimit);
        List<RequestLog> logs = requestLogRepository.findLatest(PageRequest.of(0, safeLimit));
        return logs.stream()
                .map(logMapper::toDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<LogEntryDto> listLogsByEndpoint(String endpoint, int limit) {
        int safeLimit = Math.max(0, Math.min(limit, 5000));
        String pattern = "%" + endpoint.trim() + "%";
        log.debug("Fetching latest {} logs for endpoint pattern: {}", safeLimit, pattern);
        List<RequestLog> logs = requestLogRepository.findByEndpointContaining(pattern, PageRequest.of(0, safeLimit));
        return logs.stream()
                .map(logMapper::toDto)
                .collect(Collectors.toList());
    }
}
