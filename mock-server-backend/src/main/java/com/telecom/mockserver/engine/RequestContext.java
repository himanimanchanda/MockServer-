package com.telecom.mockserver.engine;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.Builder;
import lombok.Data;

import java.util.Collections;
import java.util.Map;

@Data
@Builder
public class RequestContext {

    // Extracted from endpoint template, e.g. "/users/{id}"
    private Map<String, String> pathParams;

    private Map<String, String> queryParams;

    // Header keys are normalized to lowercase for case-insensitive lookup.
    private Map<String, String> headersLower;

    // Actual request body parsed as JSON (null if empty or non-JSON).
    private JsonNode requestBody;

    // =====================
    // SAFE ACCESS METHODS
    // =====================

    public Map<String, String> safePathParams() {
        return pathParams == null ? Collections.emptyMap() : pathParams;
    }

    public Map<String, String> safeQueryParams() {
        return queryParams == null ? Collections.emptyMap() : queryParams;
    }

    public Map<String, String> safeHeadersLower() {
        return headersLower == null ? Collections.emptyMap() : headersLower;
    }

    // =====================
    //  NEW HELPERS
    // =====================

    public boolean hasBody() {
        return requestBody != null && !requestBody.isNull();
    }

    public JsonNode getBodyOrEmpty() {
        return hasBody() ? requestBody : null;
    }
}