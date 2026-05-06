package com.telecom.mockserver.repository;

import com.telecom.mockserver.model.PermanentlyDeletedMock;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Repository for archiving permanently deleted mocks.
 * NOTE: This repository is intentionally NOT exposed via any controller/API.
 * Data is write-only (save on permanent delete) — never fetched by any endpoint.
 */
public interface PermanentlyDeletedMockRepository extends JpaRepository<PermanentlyDeletedMock, Long> {
    // Intentionally no custom queries — this is a write-only archive
}
