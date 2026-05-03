package com.telecom.mockserver.mapper;

import com.telecom.mockserver.dto.response.ProjectDto;
import com.telecom.mockserver.model.Project;
import org.springframework.stereotype.Component;

/**
 * Mapper for converting Project entity ↔ ProjectDto.
 */
@Component
public class ProjectMapper {

    public ProjectDto toDto(Project p) {
        return ProjectDto.builder()
                .id(p.getId())
                .name(p.getName())
                .build();
    }
}
