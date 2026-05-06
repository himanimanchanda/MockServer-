package com.telecom.mockserver.service.impl;

import com.telecom.mockserver.dto.response.EntityAuditLogDto;
import com.telecom.mockserver.model.AuditAction;
import com.telecom.mockserver.model.EntityAuditLog;
import com.telecom.mockserver.model.Mock;
import com.telecom.mockserver.model.Project;
import com.telecom.mockserver.repository.EntityAuditLogJpaRepository;
import com.telecom.mockserver.repository.MockJpaRepository;
import com.telecom.mockserver.repository.ProjectJpaRepository;
import com.telecom.mockserver.service.EntityAuditLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class EntityAuditLogServiceImpl implements EntityAuditLogService {

    private final EntityAuditLogJpaRepository repository;
    private final MockJpaRepository mockRepository;
    private final ProjectJpaRepository projectRepository;

    @Override
    @Transactional
    public void record(String entityType, String entityId, AuditAction action, String summary) {
        recordWithDetails(entityType, entityId, action, summary, null, null, null, null);
    }

    @Override
    @Transactional
    public void recordWithDetails(String entityType, String entityId, AuditAction action,
                                  String summary, String path, String requestBody, String responseBody) {
        recordWithDetails(entityType, entityId, action, summary, path, requestBody, responseBody, null);
    }

    @Override
    @Transactional
    public void recordWithDetails(String entityType, String entityId, AuditAction action,
                                  String summary, String path, String requestBody, String responseBody,
                                  String projectName) {
        String actor = resolveActor();
        repository.save(EntityAuditLog.builder()
                .performedAt(Instant.now())
                .entityType(entityType)
                .entityId(entityId)
                .action(action)
                .actorOlmId(actor)
                .summary(summary)
                .path(path)
                .requestBody(truncate(requestBody, 5000))
                .responseBody(truncate(responseBody, 5000))
                .projectName(projectName)
                .build());
    }

    @Override
    @Transactional(readOnly = true)
    public Page<EntityAuditLogDto> list(Pageable pageable) {
        Page<EntityAuditLogDto> page = repository.findAllByOrderByPerformedAtDesc(pageable)
                .map(e -> EntityAuditLogDto.builder()
                        .id(e.getId())
                        .performedAt(e.getPerformedAt())
                        .entityType(e.getEntityType())
                        .entityId(e.getEntityId())
                        .action(e.getAction())
                        .actorOlmId(e.getActorOlmId())
                        .summary(e.getSummary())
                        .path(e.getPath())
                        .requestBody(e.getRequestBody())
                        .responseBody(e.getResponseBody())
                        .projectName(e.getProjectName())
                        .build());

        // Resolve missing projectName for MOCK entries (backfill for older audit records)
        resolveProjectNames(page.getContent());

        return page;
    }

    /**
     * For MOCK-type audit entries that have no projectName stored,
     * look up the mock → project chain and fill in the project name.
     */
    private void resolveProjectNames(List<EntityAuditLogDto> entries) {
        // Collect MOCK entries that need project name resolution
        List<EntityAuditLogDto> needsResolution = entries.stream()
                .filter(e -> "MOCK".equals(e.getEntityType()) && e.getProjectName() == null)
                .collect(Collectors.toList());

        if (needsResolution.isEmpty()) return;

        // Batch lookup mocks by their entityIds (UUID strings)
        Set<UUID> mockIds = new HashSet<>();
        for (EntityAuditLogDto dto : needsResolution) {
            try {
                mockIds.add(UUID.fromString(dto.getEntityId()));
            } catch (IllegalArgumentException ignored) { }
        }

        if (mockIds.isEmpty()) return;

        // Find all mocks (including soft-deleted ones via native query for full coverage)
        Map<String, UUID> mockToProject = new HashMap<>();
        for (UUID mockId : mockIds) {
            mockRepository.findById(mockId)
                    .ifPresent(m -> mockToProject.put(mockId.toString(), m.getProjectId()));
        }

        // Collect unique project IDs and batch lookup project names
        Set<UUID> projectIds = new HashSet<>(mockToProject.values());
        projectIds.remove(null);
        Map<UUID, String> projectNames = new HashMap<>();
        if (!projectIds.isEmpty()) {
            projectRepository.findAllById(projectIds)
                    .forEach(p -> projectNames.put(p.getId(), p.getName()));
        }

        // Fill in project names
        for (EntityAuditLogDto dto : needsResolution) {
            UUID projId = mockToProject.get(dto.getEntityId());
            if (projId != null) {
                String name = projectNames.get(projId);
                if (name != null) {
                    dto.setProjectName(name);
                }
            }
        }
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

    private static String truncate(String value, int maxLen) {
        if (value == null) return null;
        return value.length() > maxLen ? value.substring(0, maxLen) : value;
    }
}
