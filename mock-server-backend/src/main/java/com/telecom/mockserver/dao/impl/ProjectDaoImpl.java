package com.telecom.mockserver.dao.impl;

import com.telecom.mockserver.dao.ProjectDao;
import com.telecom.mockserver.model.Project;
import com.telecom.mockserver.repository.ProjectJpaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * JPA-backed implementation of {@link ProjectDao}.
 */
@Repository
@RequiredArgsConstructor
public class ProjectDaoImpl implements ProjectDao {

    private final ProjectJpaRepository repository;

    @Override
    public Project save(Project project) {
        return repository.save(project);
    }

    @Override
    public Optional<Project> findById(UUID id) {
        return repository.findById(id);
    }

    @Override
    public List<Project> findAll() {
        return repository.findAll();
    }

    @Override
    public List<Project> findAllById(Collection<UUID> ids) {
        return repository.findAllById(ids);
    }

    @Override
    public boolean existsById(UUID id) {
        return repository.existsById(id);
    }

    @Override
    public void deleteById(UUID id) {
        repository.deleteById(id);
    }

    @Override
    public long count() {
        return repository.count();
    }
}
