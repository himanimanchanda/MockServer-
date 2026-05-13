package com.telecom.mockserver.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.SQLRestriction;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Core mock endpoint entity.
 *
 * <p><b>OPTIMIZED:</b> Headers, query params, and response headers are stored as
 * PostgreSQL JSONB columns instead of separate join tables. This eliminates 3
 * join tables and their associated N+1 query overhead.</p>
 *
 * <p><b>Permanent delete</b> uses a flag ({@code isPermanentlyDeleted}) instead
 * of hard-deleting rows and archiving to a separate table. Data stays in the
 * database permanently for compliance, but is excluded from all queries.</p>
 */
@Entity
@Table(name = "mock_endpoints", indexes = {
        @Index(name = "idx_mock_env_method", columnList = "environment, method"),
        @Index(name = "idx_mock_env_method_endpoint", columnList = "environment, method, endpoint"),
        @Index(name = "idx_mock_project", columnList = "projectId")
})
@SQLDelete(sql = "UPDATE mock_endpoints SET is_deleted = true, updated_at = NOW() WHERE id = ?")
@SQLRestriction("is_deleted = false AND is_permanently_deleted = false")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Mock {

    @Id
    @JdbcTypeCode(SqlTypes.CHAR)
    @Column(length = 36)
    private UUID id;

    @JdbcTypeCode(SqlTypes.CHAR)
    @Column(name = "project_id", nullable = false, length = 36)
    private UUID projectId;

    @Column(nullable = false, length = 512)
    private String endpoint;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private HttpMethodType method;

    @Column(columnDefinition = "TEXT")
    private String requestBody;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String responseBody;

    @Column(nullable = false)
    private int statusCode;

    /**
     * Request headers — stored as JSONB.
     * Replaces the old {@code mock_request_headers} join table.
     */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb default '{}'")
    @Builder.Default
    private Map<String, String> headers = new HashMap<>();

    /**
     * Query parameters — stored as JSONB.
     * Replaces the old {@code mock_request_query_params} join table.
     */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb default '{}'")
    @Builder.Default
    private Map<String, String> queryParams = new HashMap<>();

    /**
     * Response headers — stored as JSONB.
     * Replaces the old {@code mock_response_headers} join table.
     */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb default '{}'")
    @Builder.Default
    private Map<String, String> responseHeaders = new HashMap<>();

    private Long delayMs;

    @Column(length = 128)
    private String contentType;

    @Column(length = 4000)
    private String description;

    @Column(length = 2000)
    private String testCase;

    @Column(name = "is_deleted", nullable = false)
    @Builder.Default
    private boolean isDeleted = false;

    @Column(name = "is_permanently_deleted", nullable = false)
    @Builder.Default
    private boolean isPermanentlyDeleted = false;

    private Boolean isTemp;
    private Boolean toggleResponse;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private Environment environment;

    // Audit fields
    @Column(updatable = false)
    private Instant createdAt;
    private Instant updatedAt;
    @Column(updatable = false)
    private String createdBy;
    private String updatedBy;

    @PrePersist
    void prePersist() {
        if (id == null) id = UUID.randomUUID();
        createdAt = Instant.now();
        updatedAt = createdAt;
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = Instant.now();
    }
}