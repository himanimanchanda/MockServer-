package com.telecom.mockserver.mapper;

import com.telecom.mockserver.dto.response.MockDto;
import com.telecom.mockserver.model.Mock;
import com.telecom.mockserver.util.JsonUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Component;

/**
 * Mapper for converting {@link Mock} entity → {@link MockDto}.
 *
 * <p>Uses {@link BeanUtils#copyProperties} for clean, optimized field copying.
 * Only fields that need transformation (e.g., responseBody String → JsonNode)
 * are handled manually.</p>
 */
@Component
@RequiredArgsConstructor
public class MockMapper {

    private final JsonUtils jsonUtils;

    /**
     * Converts a Mock entity to a MockDto.
     *
     * <p>BeanUtils copies all matching fields automatically.
     * Only {@code responseBody} needs custom handling because the entity
     * stores it as a String, but the DTO exposes it as a JsonNode.</p>
     */
    public MockDto toDto(Mock mock) {
        MockDto dto = new MockDto();
        BeanUtils.copyProperties(mock, dto, "responseBody");
        dto.setResponseBody(jsonUtils.parseToJsonNode(mock.getResponseBody()));
        return dto;
    }
}
