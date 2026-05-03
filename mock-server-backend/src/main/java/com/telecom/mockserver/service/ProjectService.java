package com.telecom.mockserver.service;

import com.telecom.mockserver.dto.request.CreateProjectRequestDto;
import com.telecom.mockserver.dto.response.ProjectDto;

import java.util.List;
import java.util.UUID;

/**
 * Service interface for Project CRUD operations.
 */
public interface ProjectService {

    ProjectDto createProject(CreateProjectRequestDto request);

    List<ProjectDto> listProjects();

    void deleteProject(UUID id);
}
