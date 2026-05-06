package com.telecom.mockserver.controller;

import com.telecom.mockserver.dto.response.LogEntryDto;
import com.telecom.mockserver.service.LogService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * Controller for request log viewing and backup export.
 * Delegates to LogService (proper layered architecture).
 * Serves both /api/logs and /logs for backward compatibility.
 */
@RestController
@RequiredArgsConstructor
public class LogController {

    private final LogService logService;
    private final ObjectMapper objectMapper;

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

    /**
     * Download logs as a JSON backup file.
     * GET /api/logs/backup → downloads logs-backup-2026-05-04.json
     */
    @GetMapping({"/api/logs/backup", "/logs/backup"})
    public ResponseEntity<byte[]> downloadLogsBackup(
            @RequestParam(defaultValue = "5000") int limit
    ) {
        try {
            List<LogEntryDto> logs = logService.listLogs(limit);
            byte[] jsonBytes = objectMapper.writerWithDefaultPrettyPrinter().writeValueAsBytes(logs);

            String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd_HH-mm"));
            String filename = "logs-backup-" + timestamp + ".json";

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                    .contentType(MediaType.APPLICATION_OCTET_STREAM)
                    .contentLength(jsonBytes.length)
                    .body(jsonBytes);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
}
