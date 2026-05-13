package com.telecom.mockserver.dao.impl;

import com.telecom.mockserver.dao.MockDao;
import com.telecom.mockserver.model.Environment;
import com.telecom.mockserver.model.HttpMethodType;
import com.telecom.mockserver.model.Mock;
import com.telecom.mockserver.repository.MockJpaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * JPA-backed implementation of {@link MockDao}.
 */
@Repository
@RequiredArgsConstructor
public class MockDaoImpl implements MockDao {

    private final MockJpaRepository repository;

    @Override
    public Mock save(Mock mock) {
        return repository.save(mock);
    }

    @Override
    public Optional<Mock> findById(UUID id) {
        return repository.findById(id);
    }

    @Override
    public List<Mock> findAllOrdered() {
        return repository.findAllOrdered();
    }

    @Override
    public List<Mock> findByProjectIdOrdered(UUID projectId) {
        return repository.findByProjectIdOrdered(projectId);
    }

    @Override
    public List<Mock> findByProjectId(UUID projectId) {
        return repository.findByProjectId(projectId);
    }

    @Override
    public void deleteByProjectId(UUID projectId) {
        repository.deleteByProjectId(projectId);
    }

    @Override
    public boolean existsByMethodAndEndpointAndEnvironment(HttpMethodType method, String endpoint, Environment env) {
        return repository.existsByMethodAndEndpointAndEnvironment(method, endpoint, env);
    }

    @Override
    public boolean existsDuplicate(HttpMethodType method, String endpoint, Environment env, UUID excludeId) {
        return repository.existsDuplicate(method, endpoint, env, excludeId);
    }

    @Override
    public void recoverMockNative(String id) {
        repository.recoverMockNative(id);
    }

    @Override
    public List<Mock> findDeletedMocksNative() {
        return repository.findDeletedMocksNative();
    }

    @Override
    public Optional<Mock> findDeletedMockById(String id) {
        return repository.findDeletedMockById(id);
    }

    @Override
    public void permanentlyDeleteById(String id) {
        repository.permanentlyDeleteById(id);
    }

    @Override
    public Optional<Mock> findPermanentlyDeletedById(String id) {
        return repository.findPermanentlyDeletedById(id);
    }

    @Override
    public long count() {
        return repository.count();
    }
}
