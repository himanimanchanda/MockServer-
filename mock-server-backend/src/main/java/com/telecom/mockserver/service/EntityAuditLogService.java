package com.telecom.mockserver.service;

import com.telecom.mockserver.model.AuditAction;
import com.telecom.mockserver.dto.response.EntityAuditLogDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface EntityAuditLogService {

    void record(String entityType, String entityId, AuditAction action, String summary);

    Page<EntityAuditLogDto> list(Pageable pageable);
}
