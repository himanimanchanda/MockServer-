package com.telecom.mockserver.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LogEntryDto {
    private Long id;
    private UUID matchedMockId;
    private String endpoint;
    private String method;
    private Instant timestamp;

    // ===== NEW FIELDS =====
    private String requestHeaders;
    private String requestBody;
    private String queryParams;
    private String responseBody;
    private Integer responseStatusCode;
    private Boolean matched;
}
