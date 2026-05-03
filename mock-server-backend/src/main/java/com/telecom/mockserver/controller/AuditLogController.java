package com.telecom.mockserver.controller;

import com.telecom.mockserver.dto.response.EntityAuditLogDto;
import com.telecom.mockserver.service.EntityAuditLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * CRUD audit trail (separate from request hit logs and Hibernate Envers tables).
 */
@RestController
@RequiredArgsConstructor
public class AuditLogController {

    private final EntityAuditLogService auditLogService;

    @GetMapping({"/api/audit-logs", "/audit-logs"})
    public ResponseEntity<Page<EntityAuditLogDto>> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        int safeSize = Math.min(Math.max(size, 1), 100);
        Pageable pageable = PageRequest.of(Math.max(page, 0), safeSize, Sort.by(Sort.Direction.DESC, "performedAt"));
        return ResponseEntity.ok(auditLogService.list(pageable));
    }
}
