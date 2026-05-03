package com.telecom.mockserver.controller;

import com.telecom.mockserver.dto.request.CreateProjectRequestDto;
import com.telecom.mockserver.dto.response.MockDto;
import com.telecom.mockserver.dto.response.ProjectDto;
import com.telecom.mockserver.service.MockService;
import com.telecom.mockserver.service.ProjectService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * Unified controller for Project CRUD operations.
 * Serves both /api/projects and /projects endpoints for backward compatibility.
 */
@RestController
@RequiredArgsConstructor
public class ProjectController {

    private final ProjectService projectService;
    private final MockService mockService;

    // ========== CREATE ==========

    @PostMapping({"/api/projects", "/projects"})
    public ResponseEntity<ProjectDto> createProject(@Valid @RequestBody CreateProjectRequestDto request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(projectService.createProject(request));
    }

    // ========== READ ==========

    @GetMapping({"/api/projects", "/projects"})
    public ResponseEntity<List<ProjectDto>> listProjects() {
        return ResponseEntity.ok(projectService.listProjects());
    }

    @GetMapping("/api/projects/{id}/mocks")
    public ResponseEntity<List<MockDto>> listProjectMocks(@PathVariable("id") UUID id) {
        return ResponseEntity.ok(mockService.listMocksForProject(id));
    }

    // ========== DELETE ==========

    @DeleteMapping({"/api/projects/{id}", "/projects/{id}"})
    public ResponseEntity<Void> deleteProject(@PathVariable("id") UUID id) {
        projectService.deleteProject(id);
        return ResponseEntity.noContent().build();
    }
}
