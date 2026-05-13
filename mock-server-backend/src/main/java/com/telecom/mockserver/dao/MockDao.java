package com.telecom.mockserver.dao;

import com.telecom.mockserver.model.Environment;
import com.telecom.mockserver.model.HttpMethodType;
import com.telecom.mockserver.model.Mock;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Data Access Object for {@link Mock} entity.
 *
 * <p>Decouples business logic from the JPA repository implementation,
 * making the service layer testable and independent of Spring Data internals.</p>
 */
public interface MockDao {

    Mock save(Mock mock);

    Optional<Mock> findById(UUID id);

    List<Mock> findAllOrdered();

    List<Mock> findByProjectIdOrdered(UUID projectId);

    List<Mock> findByProjectId(UUID projectId);

    void deleteByProjectId(UUID projectId);

    boolean existsByMethodAndEndpointAndEnvironment(HttpMethodType method, String endpoint, Environment env);

    boolean existsDuplicate(HttpMethodType method, String endpoint, Environment env, UUID excludeId);

    void recoverMockNative(String id);

    List<Mock> findDeletedMocksNative();

    Optional<Mock> findDeletedMockById(String id);

    void permanentlyDeleteById(String id);

    Optional<Mock> findPermanentlyDeletedById(String id);

    long count();
}
