package com.telecom.mockserver.service.impl;

import com.telecom.mockserver.dao.MockDao;
import com.telecom.mockserver.dao.ProjectDao;
import com.telecom.mockserver.dto.request.CreateProjectRequestDto;
import com.telecom.mockserver.dto.response.ProjectDto;
import com.telecom.mockserver.exception.NotFoundException;
import com.telecom.mockserver.mapper.ProjectMapper;
import com.telecom.mockserver.model.AuditAction;
import com.telecom.mockserver.model.Project;
import com.telecom.mockserver.service.AuditService;
import com.telecom.mockserver.service.ProjectService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProjectServiceImpl implements ProjectService {

    private final ProjectDao projectDao;
    private final MockDao mockDao;
    private final ProjectMapper projectMapper;
    private final AuditService auditService;

    @Override
    @Transactional
    public ProjectDto createProject(CreateProjectRequestDto request) {
        String olmId = "system";
        if (SecurityContextHolder.getContext().getAuthentication() != null) {
            olmId = SecurityContextHolder.getContext().getAuthentication().getName();
        }

        UUID id = UUID.randomUUID();
        Project p = Project.builder()
                .id(id)
                .name(request.getName().trim())
                .createdBy(olmId)
                .ownerOlmId(olmId)
                .build();
        projectDao.save(p);
        auditService.record("PROJECT", p.getId().toString(), AuditAction.CREATE, p.getName());
        return projectMapper.toDto(p);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProjectDto> listProjects() {
        return projectDao.findAll()
                .stream()
                .map(projectMapper::toDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void deleteProject(UUID id) {
        if (!projectDao.existsById(id)) {
            throw new NotFoundException("Project not found: " + id);
        }
        mockDao.deleteByProjectId(id);
        auditService.record("PROJECT", id.toString(), AuditAction.DELETE, "deleted project and its routes");
        projectDao.deleteById(id);
    }
}
