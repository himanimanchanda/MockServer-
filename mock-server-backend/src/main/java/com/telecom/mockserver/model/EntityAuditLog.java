package com.telecom.mockserver.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "entity_audit_logs", indexes = {
        @Index(name = "idx_audit_performed", columnList = "performedAt")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EntityAuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Instant performedAt;

    @Column(nullable = false, length = 48)
    private String entityType;

    @Column(nullable = false, length = 64)
    private String entityId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 24)
    private AuditAction action;

    @Column(length = 200)
    private String actorOlmId;

    /** Short human-readable line (optional) */
    @Column(columnDefinition = "TEXT")
    private String summary;

    /** The API path/endpoint of the entity */
    @Column(length = 512)
    private String path;

    /** Snapshot of request body at the time of the action */
    @Column(columnDefinition = "TEXT")
    private String requestBody;

    /** Snapshot of response body at the time of the action */
    @Column(columnDefinition = "TEXT")
    private String responseBody;

    /** Human-readable project name at the time of the action */
    @Column(length = 256)
    private String projectName;

    @PrePersist
    void prePersist() {
        if (performedAt == null) {
            performedAt = Instant.now();
        }
    }
}
