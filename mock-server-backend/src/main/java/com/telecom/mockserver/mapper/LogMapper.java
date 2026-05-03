package com.telecom.mockserver.mapper;

import com.telecom.mockserver.dto.response.LogEntryDto;
import com.telecom.mockserver.model.RequestLog;
import org.springframework.stereotype.Component;

/**
 * Mapper for converting RequestLog entity → LogEntryDto.
 */
@Component
public class LogMapper {

    public LogEntryDto toDto(RequestLog log) {
        return LogEntryDto.builder()
                .id(log.getId())
                .matchedMockId(log.getMatchedMockId())
                .endpoint(log.getEndpoint())
                .method(log.getMethod())
                .timestamp(log.getTimestamp())
                .requestHeaders(log.getRequestHeaders())
                .requestBody(log.getRequestBody())
                .queryParams(log.getQueryParams())
                .responseBody(log.getResponseBody())
                .responseStatusCode(log.getResponseStatusCode())
                .matched(log.getMatched())
                .build();
    }
}
