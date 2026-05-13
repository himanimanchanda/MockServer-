package com.telecom.mockserver.dao;

import com.telecom.mockserver.model.Project;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Data Access Object for {@link Project} entity.
 */
public interface ProjectDao {

    Project save(Project project);

    Optional<Project> findById(UUID id);

    List<Project> findAll();

    List<Project> findAllById(Collection<UUID> ids);

    boolean existsById(UUID id);

    void deleteById(UUID id);

    long count();
}
