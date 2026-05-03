package com.telecom.mockserver.mapper;

import com.telecom.mockserver.dto.response.MockDto;
import com.telecom.mockserver.model.Mock;
import com.telecom.mockserver.util.JsonUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Mapper for converting Mock entity ↔ MockDto.
 */
@Component
@RequiredArgsConstructor
public class MockMapper {

    private final JsonUtils jsonUtils;

    public MockDto toDto(Mock m) {
        return MockDto.builder()
                .id(m.getId())
                .projectId(m.getProjectId())
                .endpoint(m.getEndpoint())
                .method(m.getMethod())
                .requestBody(m.getRequestBody())
                .responseBody(jsonUtils.parseToJsonNode(m.getResponseBody()))
                .statusCode(m.getStatusCode())
                .headers(m.getHeaders() == null ? null : new java.util.HashMap<>(m.getHeaders()))
                .queryParams(m.getQueryParams() == null ? null : new java.util.HashMap<>(m.getQueryParams()))
                .responseHeaders(m.getResponseHeaders() == null ? null : new java.util.HashMap<>(m.getResponseHeaders()))
                .delayMs(m.getDelayMs())
                .contentType(m.getContentType())
                .isTemp(m.getIsTemp())
                .toggleResponse(m.getToggleResponse())
                .environment(m.getEnvironment())
                .testCase(m.getTestCase())
                .description(m.getDescription())
                .createdAt(m.getCreatedAt())
                .updatedAt(m.getUpdatedAt())
                .createdBy(m.getCreatedBy())
                .updatedBy(m.getUpdatedBy())
                .build();
    }
}
