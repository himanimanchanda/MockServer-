package com.telecom.mockserver.dto.request;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.JsonDeserializer;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.telecom.mockserver.model.Environment;
import com.telecom.mockserver.model.HttpMethodType;
import com.telecom.mockserver.validation.ValidEndpointTemplate;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Data
public class CreateMockRequestDto {

    private UUID projectId;

    @NotBlank
    @ValidEndpointTemplate
    @JsonDeserialize(using = EndpointColonToBraceDeserializer.class)
    private String endpoint;

    @NotNull
    private HttpMethodType method;

    private String testCase;
    private String description;
    private String requestBody;

    @NotBlank
    private String responseBody;

    @Min(100)
    private int statusCode = 200;

    private String contentType;

    // List form — what ApiRouteForm sends: [{key, value, dynamic}]
    private List<Map<String, Object>> headersList;
    private List<Map<String, Object>> queryList;
    private List<Map<String, Object>> responseHeadersList;

    // Flat-map fallback (backwards compat)
    private Map<String, String> headers;
    private Map<String, String> queryParams;
    private Map<String, String> responseHeaders;

    // delay as int (what frontend sends in "delay" field)
    @Min(0)
    private Integer delay;

    // delayMs as long alternative
    @Min(0)
    private Long delayMs = 0L;

    private Boolean isTemp;
    private Boolean toggleResponse;

    private Environment environment = Environment.DEV;

    // Converts /path/:id → /path/{id}
    public static class EndpointColonToBraceDeserializer extends JsonDeserializer<String> {
        @Override
        public String deserialize(JsonParser p, DeserializationContext ctxt) throws IOException {
            String raw = p.getValueAsString();
            if (raw == null) return null;
            String t = raw.trim().replaceAll("/:([A-Za-z_][A-Za-z0-9_]*)", "/{$1}");
            if (t.isEmpty()) return t;
            return t.startsWith("/") ? t : "/" + t;
        }
    }
}
