package com.telecom.mockserver.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "request_logs", indexes = {
        @Index(name = "idx_log_timestamp", columnList = "timestamp DESC"),
        @Index(name = "idx_log_endpoint", columnList = "endpoint"),
        @Index(name = "idx_log_matched_mock", columnList = "matchedMockId")
})
public class RequestLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 512)
    private String endpoint;

    @Column(nullable = false, length = 16)
    private String method;

    @Column(nullable = false)
    private Instant timestamp;

    @JdbcTypeCode(SqlTypes.CHAR)
    @Column(nullable = true, length = 36)
    private UUID matchedMockId;

    // ===== NEW FIELDS (additive — existing rows will have null) =====

    /** Serialized JSON of request headers */
    @Column(columnDefinition = "TEXT")
    private String requestHeaders;

    /** Raw request body */
    @Column(columnDefinition = "TEXT")
    private String requestBody;

    /** Serialized query parameters as JSON */
    @Column(columnDefinition = "TEXT")
    private String queryParams;

    /** Response body that was returned */
    @Column(columnDefinition = "TEXT")
    private String responseBody;

    /** HTTP status code returned */
    @Column
    private Integer responseStatusCode;

    /** Whether a mock was matched for this request */
    @Column
    private Boolean matched;
}
