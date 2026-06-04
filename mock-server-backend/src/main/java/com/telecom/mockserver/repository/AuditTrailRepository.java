package com.telecom.mockserver.repository;

import com.telecom.mockserver.model.AuditTrail;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * JPA repository for {@link AuditTrail} entity.
 *
 * <p>This repository is NOT used directly by services — access goes
 * through {@link com.telecom.mockserver.dao.AuditDao}.</p>
 */
public interface AuditTrailRepository extends JpaRepository<AuditTrail, Long> {

    Page<AuditTrail> findAllByOrderByPerformedAtDesc(Pageable pageable);
}
