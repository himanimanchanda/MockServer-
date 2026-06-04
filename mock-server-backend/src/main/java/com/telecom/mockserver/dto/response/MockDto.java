package com.telecom.mockserver.dto.response;

import com.fasterxml.jackson.databind.JsonNode;
import com.telecom.mockserver.model.Environment;
import com.telecom.mockserver.model.HttpMethodType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MockDto {
    private UUID id;
    private UUID projectId;
    private String endpoint;
    private HttpMethodType method;
    private String requestBody;
    private JsonNode responseBody;
    private int statusCode;
    private Map<String, String> headers;
    private Map<String, String> queryParams;
    private Map<String, String> responseHeaders;
    private Long delayMs;
    private String contentType;
    private Boolean isTemp;
    private Boolean toggleResponse;
    private Environment environment;
    private String testCase;
    private String description;

    // Audit fields
    private Instant createdAt;
    private Instant updatedAt;
    private String createdBy;
    private String updatedBy;
}
