package com.telecom.mockserver.service;

import com.telecom.mockserver.dto.response.LogEntryDto;

import java.util.List;

/**
 * Service interface for request log operations.
 */
public interface LogService {

    List<LogEntryDto> listLogs(int limit);

    List<LogEntryDto> listLogsByEndpoint(String endpoint, int limit);
}
