package com.telecom.mockserver.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/**
 * Unified audit trail entity.
 *
 * <p>Replaces the previous {@code user_action_audit_logs} + {@code mock_audit_history}
 * + {@code revision_info} + {@code deleted_mock_archives} (4 tables → 1 table).
 *
 * <p>All system events (CREATE, UPDATE, DELETE, RECOVER, PERMANENT_DELETE) are
 * recorded here, providing a single, queryable audit log for the entire platform.</p>
 */
@Entity
@Table(name = "audit_trail", indexes = {
        @Index(name = "idx_audit_performed", columnList = "performedAt"),
        @Index(name = "idx_audit_entity", columnList = "entityType, entityId")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuditTrail {

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
