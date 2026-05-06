package com.telecom.mockserver.dto.response;

import com.telecom.mockserver.model.AuditAction;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
public class EntityAuditLogDto {
    private Long id;
    private Instant performedAt;
    private String entityType;
    private String entityId;
    private AuditAction action;
    private String actorOlmId;
    private String summary;
    private String path;
    private String requestBody;
    private String responseBody;
    private String projectName;
}
