package com.telecom.mockserver.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

/**
 * Archive table for permanently deleted mocks.
 * Data is stored in PostgreSQL permanently but is NOT exposed via any API endpoint.
 * This serves as a compliance/audit archive — data exists in the DB but cannot be fetched.
 */
@Entity
@Table(name = "permanently_deleted_mocks", indexes = {
        @Index(name = "idx_perm_deleted_at", columnList = "deletedAt")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PermanentlyDeletedMock {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Original mock UUID */
    @Column(nullable = false, length = 36)
    private String originalMockId;

    @Column(nullable = false, length = 512)
    private String endpoint;

    @Column(nullable = false, length = 16)
    private String method;

    @Column(length = 36)
    private String projectId;

    @Column(columnDefinition = "TEXT")
    private String requestBody;

    @Column(columnDefinition = "TEXT")
    private String responseBody;

    private int statusCode;

    @Column(length = 128)
    private String contentType;

    @Column(length = 16)
    private String environment;

    @Column(length = 2000)
    private String testCase;

    @Column(length = 4000)
    private String description;

    /** Who deleted it */
    @Column(length = 200)
    private String deletedBy;

    /** When it was permanently deleted */
    @Column(nullable = false)
    private Instant deletedAt;

    /** Full JSON snapshot of the mock at time of deletion */
    @Column(columnDefinition = "TEXT")
    private String fullSnapshot;

    @PrePersist
    void prePersist() {
        if (deletedAt == null) {
            deletedAt = Instant.now();
        }
    }
}
