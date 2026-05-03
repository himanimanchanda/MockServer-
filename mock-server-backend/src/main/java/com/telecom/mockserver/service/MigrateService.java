package com.telecom.mockserver.service;

import com.telecom.mockserver.dto.request.MigrateRequestDto;
import com.telecom.mockserver.dto.response.MockDto;

import java.util.List;

/**
 * Service interface for migrating mocks between projects.
 */
public interface MigrateService {

    List<MockDto> migrate(MigrateRequestDto request);
}
