package com.telecom.mockserver.dto.response;

import com.fasterxml.jackson.databind.JsonNode;
import com.telecom.mockserver.model.Environment;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Data
@Builder
public class MockExecutionResult {
    private UUID matchedMockId;
    private String endpoint;
    private String method;
    private Instant timestamp;
    private Environment environment;
    private int statusCode;
    private Map<String, String> headers;
    private Map<String, String> responseHeaders;
    private String contentType;
    private JsonNode responseBody;
}
