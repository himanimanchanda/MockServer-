package com.telecom.mockserver.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.telecom.mockserver.dto.request.CreateMockRequestDto;
import com.telecom.mockserver.dto.request.UpdateMockRequestDto;
import com.telecom.mockserver.dto.response.MockDto;
import com.telecom.mockserver.dto.response.MockExecutionResult;
import com.telecom.mockserver.model.Environment;
import com.telecom.mockserver.model.HttpMethodType;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Service interface for Mock CRUD and execution operations.
 */
public interface MockService {

    MockDto createMock(CreateMockRequestDto request);

    List<MockDto> listMocks();

    List<MockDto> listMocksForProject(UUID projectId);

    List<MockDto> listMocksForEnvironment(Environment env);

    List<MockDto> listDeletedMocks();

    List<MockDto> searchMocks(String query);

    MockDto updateMock(UUID id, UpdateMockRequestDto request);

    void deleteMock(UUID id);

    void recoverMock(UUID id);

    MockExecutionResult execute(
            String requestPath,
            HttpMethodType requestMethod,
            Map<String, String> queryParams,
            Map<String, String> headersLower,
            JsonNode requestBody,
            Environment environment
    );
}