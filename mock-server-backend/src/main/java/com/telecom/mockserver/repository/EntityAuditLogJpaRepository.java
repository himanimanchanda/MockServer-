package com.telecom.mockserver.repository;

import com.telecom.mockserver.model.EntityAuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EntityAuditLogJpaRepository extends JpaRepository<EntityAuditLog, Long> {

    Page<EntityAuditLog> findAllByOrderByPerformedAtDesc(Pageable pageable);
}
