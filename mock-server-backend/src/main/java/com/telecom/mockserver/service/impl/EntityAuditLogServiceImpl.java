package com.telecom.mockserver.service.impl;

import com.telecom.mockserver.dto.response.EntityAuditLogDto;
import com.telecom.mockserver.model.AuditAction;
import com.telecom.mockserver.model.EntityAuditLog;
import com.telecom.mockserver.repository.EntityAuditLogJpaRepository;
import com.telecom.mockserver.service.EntityAuditLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Service
@RequiredArgsConstructor
public class EntityAuditLogServiceImpl implements EntityAuditLogService {

    private final EntityAuditLogJpaRepository repository;

    @Override
    @Transactional
    public void record(String entityType, String entityId, AuditAction action, String summary) {
        String actor = resolveActor();
        repository.save(EntityAuditLog.builder()
                .performedAt(Instant.now())
                .entityType(entityType)
                .entityId(entityId)
                .action(action)
                .actorOlmId(actor)
                .summary(summary)
                .build());
    }

    @Override
    @Transactional(readOnly = true)
    public Page<EntityAuditLogDto> list(Pageable pageable) {
        return repository.findAllByOrderByPerformedAtDesc(pageable)
                .map(e -> EntityAuditLogDto.builder()
                        .id(e.getId())
                        .performedAt(e.getPerformedAt())
                        .entityType(e.getEntityType())
                        .entityId(e.getEntityId())
                        .action(e.getAction())
                        .actorOlmId(e.getActorOlmId())
                        .summary(e.getSummary())
                        .build());
    }

    private static String resolveActor() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return "anonymous";
        }
        String name = auth.getName();
        if (name == null || name.isBlank() || "anonymousUser".equalsIgnoreCase(name)) {
            return "anonymous";
        }
        return name;
    }
}
