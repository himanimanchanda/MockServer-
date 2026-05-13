package com.telecom.mockserver.dao;

import com.telecom.mockserver.model.AuditTrail;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * Data Access Object for {@link AuditTrail} entity.
 */
public interface AuditDao {

    AuditTrail save(AuditTrail auditTrail);

    Page<AuditTrail> findAllByOrderByPerformedAtDesc(Pageable pageable);

    long count();
}
