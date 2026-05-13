package com.telecom.mockserver.service.impl;

import com.telecom.mockserver.dao.ProjectDao;
import com.telecom.mockserver.dto.request.CreateMockRequestDto;
import com.telecom.mockserver.dto.request.MigrateRequestDto;
import com.telecom.mockserver.dto.response.MockDto;
import com.telecom.mockserver.exception.BadRequestException;
import com.telecom.mockserver.service.MigrateService;
import com.telecom.mockserver.service.MockService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MigrateServiceImpl implements MigrateService {

    private final MockService mockService;
    private final ProjectDao projectDao;

    @Override
    @Transactional
    public List<MockDto> migrate(MigrateRequestDto request) {
        UUID from = request.getFromProjectId();
        UUID to = request.getToProjectId();

        if (from.equals(to)) {
            throw new BadRequestException("fromProjectId and toProjectId must be different");
        }
        if (!projectDao.existsById(from)) {
            throw new BadRequestException("Invalid fromProjectId: " + from);
        }
        if (!projectDao.existsById(to)) {
            throw new BadRequestException("Invalid toProjectId: " + to);
        }

        List<MockDto> fromMocks = mockService.listMocksForProject(from);
        return fromMocks.stream()
                .map(m -> {
                    CreateMockRequestDto dto = new CreateMockRequestDto();
                    dto.setProjectId(to);
                    dto.setEndpoint(m.getEndpoint());
                    dto.setMethod(m.getMethod());
                    dto.setTestCase(m.getTestCase());
                    dto.setDescription(m.getDescription());
                    dto.setRequestBody(m.getRequestBody());
                    dto.setResponseBody(m.getResponseBody() == null ? "{}" : m.getResponseBody().toString());
                    dto.setStatusCode(m.getStatusCode());
                    dto.setHeaders(m.getHeaders());
                    dto.setQueryParams(m.getQueryParams());
                    dto.setDelayMs(m.getDelayMs() == null ? 0L : m.getDelayMs());
                    dto.setEnvironment(m.getEnvironment());
                    return mockService.createMock(dto);
                })
                .collect(Collectors.toList());
    }
}
