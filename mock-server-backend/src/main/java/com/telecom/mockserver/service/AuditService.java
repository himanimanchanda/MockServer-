package com.telecom.mockserver.service;

import com.telecom.mockserver.model.AuditAction;
import com.telecom.mockserver.dto.response.EntityAuditLogDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * Service interface for unified audit trail operations.
 *
 * <p>Replaces the old {@code EntityAuditLogService} while maintaining the same
 * contract. Internally uses the new {@code audit_trail} table via DAO layer.</p>
 */
public interface AuditService {

    void record(String entityType, String entityId, AuditAction action, String summary);

    /** Enhanced record with full context: path, request body, response body */
    void recordWithDetails(String entityType, String entityId, AuditAction action,
                           String summary, String path, String requestBody, String responseBody);

    /** Enhanced record with full context + project name */
    void recordWithDetails(String entityType, String entityId, AuditAction action,
                           String summary, String path, String requestBody, String responseBody,
                           String projectName);

    Page<EntityAuditLogDto> list(Pageable pageable);
}
