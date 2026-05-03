package com.telecom.mockserver.controller;

import com.telecom.mockserver.dto.request.CreateMockRequestDto;
import com.telecom.mockserver.dto.request.UpdateMockRequestDto;
import com.telecom.mockserver.dto.response.MockDto;
import com.telecom.mockserver.service.MockService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * Unified controller for Mock CRUD operations.
 * Serves both /api/mocks and /routes endpoints for backward compatibility.
 */
@RestController
@RequiredArgsConstructor
public class MockController {

    private final MockService mockService;

    // ========== CREATE ==========

    @PostMapping({"/api/mocks", "/routes"})
    public ResponseEntity<MockDto> createMock(@Valid @RequestBody CreateMockRequestDto request) {
        MockDto created = mockService.createMock(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PostMapping("/api/mocks/import")
    public ResponseEntity<List<MockDto>> importMocks(@RequestBody List<CreateMockRequestDto> requests) {
        List<MockDto> created = new java.util.ArrayList<>();
        for (CreateMockRequestDto req : requests) {
            try {
                created.add(mockService.createMock(req));
            } catch (Exception e) {
                // Skip duplicates silently
            }
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    // ========== READ ==========

    @GetMapping("/api/mocks")
    public ResponseEntity<List<MockDto>> listMocks() {
        return ResponseEntity.ok(mockService.listMocks());
    }

    @GetMapping("/routes")
    public ResponseEntity<List<MockDto>> listRoutes(
            @RequestParam(value = "projectId", required = false) UUID projectId
    ) {
        if (projectId != null) {
            return ResponseEntity.ok(mockService.listMocksForProject(projectId));
        }
        return ResponseEntity.ok(mockService.listMocks());
    }

    @GetMapping({"/api/mocks/trash", "/routes/trash"})
    public ResponseEntity<List<MockDto>> listTrash() {
        return ResponseEntity.ok(mockService.listDeletedMocks());
    }

    @GetMapping("/api/mocks/search")
    public ResponseEntity<List<MockDto>> searchMocks(@RequestParam String query) {
        return ResponseEntity.ok(mockService.searchMocks(query));
    }

    // ========== UPDATE ==========

    @PutMapping({"/api/mocks/{id}", "/routes/{id}"})
    public ResponseEntity<MockDto> updateMock(
            @PathVariable("id") UUID id,
            @Valid @RequestBody UpdateMockRequestDto request
    ) {
        return ResponseEntity.ok(mockService.updateMock(id, request));
    }

    // ========== DELETE ==========

    @DeleteMapping({"/api/mocks/{id}", "/routes/{id}"})
    public ResponseEntity<Void> deleteMock(@PathVariable("id") UUID id) {
        mockService.deleteMock(id);
        return ResponseEntity.noContent().build();
    }

    // ========== RECOVER ==========

    @PostMapping({"/api/mocks/{id}/recover", "/routes/{id}/recover"})
    public ResponseEntity<Void> recoverMock(@PathVariable("id") UUID id) {
        mockService.recoverMock(id);
        return ResponseEntity.ok().build();
    }
}
