package com.telecom.mockserver.controller;

import com.telecom.mockserver.dto.response.LogEntryDto;
import com.telecom.mockserver.service.LogService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Controller for request log viewing.
 * Delegates to LogService (proper layered architecture).
 * Serves both /api/logs and /logs for backward compatibility.
 */
@RestController
@RequiredArgsConstructor
public class LogController {

    private final LogService logService;

    @GetMapping({"/api/logs", "/logs"})
    public ResponseEntity<List<LogEntryDto>> listLogs(
            @RequestParam(defaultValue = "200") int limit,
            @RequestParam(required = false) String endpoint
    ) {
        if (endpoint != null && !endpoint.isBlank()) {
            return ResponseEntity.ok(logService.listLogsByEndpoint(endpoint, limit));
        }
        return ResponseEntity.ok(logService.listLogs(limit));
    }
}
