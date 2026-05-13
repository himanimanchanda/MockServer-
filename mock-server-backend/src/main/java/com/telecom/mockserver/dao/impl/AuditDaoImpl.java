package com.telecom.mockserver.dao.impl;

import com.telecom.mockserver.dao.AuditDao;
import com.telecom.mockserver.model.AuditTrail;
import com.telecom.mockserver.repository.AuditTrailRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;

/**
 * JPA-backed implementation of {@link AuditDao}.
 */
@Repository
@RequiredArgsConstructor
public class AuditDaoImpl implements AuditDao {

    private final AuditTrailRepository repository;

    @Override
    public AuditTrail save(AuditTrail auditTrail) {
        return repository.save(auditTrail);
    }

    @Override
    public Page<AuditTrail> findAllByOrderByPerformedAtDesc(Pageable pageable) {
        return repository.findAllByOrderByPerformedAtDesc(pageable);
    }

    @Override
    public long count() {
        return repository.count();
    }
}
