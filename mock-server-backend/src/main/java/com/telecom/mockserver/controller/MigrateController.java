package com.telecom.mockserver.controller;

import com.telecom.mockserver.dto.request.MigrateRequestDto;
import com.telecom.mockserver.dto.response.MockDto;
import com.telecom.mockserver.service.MigrateService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Controller for migrating mocks between projects.
 * Delegates all business logic to MigrateService.
 */
@RestController
@RequestMapping("/migrate")
@RequiredArgsConstructor
public class MigrateController {

    private final MigrateService migrateService;

    @PostMapping
    public ResponseEntity<List<MockDto>> migrate(@Valid @RequestBody MigrateRequestDto request) {
        return ResponseEntity.ok(migrateService.migrate(request));
    }
}
