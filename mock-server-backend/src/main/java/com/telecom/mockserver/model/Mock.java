package com.telecom.mockserver.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.BatchSize;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.SQLRestriction;
import org.hibernate.envers.Audited;
import org.hibernate.envers.NotAudited;
import org.hibernate.type.SqlTypes;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Audited
@EntityListeners(AuditingEntityListener.class)
@SQLRestriction("is_deleted = false")
@org.hibernate.annotations.SQLDelete(sql = "UPDATE mocks SET is_deleted = true WHERE id=?")
@Table(name = "mocks", indexes = {
        @Index(name = "idx_mock_env_method", columnList = "environment, method"),
        @Index(name = "idx_mock_env_method_endpoint", columnList = "environment, method, endpoint"),
        @Index(name = "idx_mock_project", columnList = "projectId")
})
@NamedEntityGraph(
        name = "Mock.withCollections",
        attributeNodes = {
                @NamedAttributeNode("headers"),
                @NamedAttributeNode("queryParams"),
                @NamedAttributeNode("responseHeaders")
        }
)
public class Mock implements java.io.Serializable {

    @Id
    @JdbcTypeCode(SqlTypes.CHAR)
    private UUID id;

    @Column(nullable = false, length = 512)
    private String endpoint;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private HttpMethodType method;

    @JdbcTypeCode(SqlTypes.CHAR)
    @Column(nullable = false, length = 36)
    private UUID projectId;

    // FIX: @Lob on MySQL maps to LONGBLOB (binary) → use TEXT explicitly
    @Column(columnDefinition = "TEXT")
    private String requestBody;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String responseBody;

    @Column(nullable = false)
    private int statusCode;

    // Request-matching headers — LAZY + batched to eliminate N+1
    @NotAudited
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "mock_headers", joinColumns = @JoinColumn(name = "mock_id"))
    @MapKeyColumn(name = "header_key", length = 512)
    @Column(name = "header_value", length = 4096)
    @BatchSize(size = 50)
    private Map<String, String> headers;

    // Request-matching query params — LAZY + batched
    @NotAudited
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "mock_query_params", joinColumns = @JoinColumn(name = "mock_id"))
    @MapKeyColumn(name = "param_key", length = 512)
    @Column(name = "param_value", length = 4096)
    @BatchSize(size = 50)
    private Map<String, String> queryParams;

    // Response headers sent back to the HTTP caller — LAZY + batched
    @NotAudited
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "mock_response_headers", joinColumns = @JoinColumn(name = "mock_id"))
    @MapKeyColumn(name = "header_key", length = 512)
    @Column(name = "header_value", length = 4096)
    @BatchSize(size = 50)
    private Map<String, String> responseHeaders;

    private Long delayMs;

    @Column(length = 128)
    private String contentType;

    private Boolean isTemp;

    private Boolean toggleResponse;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private Environment environment;

    @Column(length = 2000)
    private String testCase;

    @Column(length = 4000)
    private String description;

    // Soft delete
    @Column(name = "is_deleted", nullable = false)
    @Builder.Default
    private boolean isDeleted = false;

    // Auditing Fields
    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private Instant updatedAt;

    @CreatedBy
    @Column(name = "created_by", updatable = false)
    private String createdBy;

    @LastModifiedBy
    @Column(name = "updated_by")
    private String updatedBy;
}