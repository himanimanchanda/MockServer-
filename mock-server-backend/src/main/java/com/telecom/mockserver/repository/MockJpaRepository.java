package com.telecom.mockserver.repository;

import com.telecom.mockserver.model.Environment;
import com.telecom.mockserver.model.HttpMethodType;
import com.telecom.mockserver.model.Mock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface MockJpaRepository extends JpaRepository<Mock, UUID> {

    /**
     * Fetch ALL mocks ordered by endpoint (latest-first by ID as tiebreaker).
     * No @EntityGraph — rely on @BatchSize(50) for LAZY collections.
     * This avoids the Cartesian product explosion that caused request hangs.
     */
    @Query("SELECT m FROM Mock m ORDER BY m.createdAt DESC, m.id DESC")
    List<Mock> findAllOrdered();

    /**
     * Fetch mocks for a specific project, ordered consistently.
     */
    @Query("SELECT m FROM Mock m WHERE m.projectId = :projectId ORDER BY m.createdAt DESC, m.id DESC")
    List<Mock> findByProjectIdOrdered(@Param("projectId") UUID projectId);

    /**
     * Original findByProjectId — kept for backward compat with other callers.
     */
    List<Mock> findByProjectId(UUID projectId);

    void deleteByProjectId(UUID projectId);

    /**
     * Duplicate detection: check if a mock already exists for the given
     * method + endpoint + environment combination.
     */
    boolean existsByMethodAndEndpointAndEnvironment(
            HttpMethodType method, String endpoint, Environment environment);

    /**
     * For duplicate check on update: exclude the mock being updated.
     */
    @Query("SELECT COUNT(m) > 0 FROM Mock m WHERE m.method = :method AND m.endpoint = :endpoint AND m.environment = :env AND m.id <> :excludeId")
    boolean existsDuplicate(
            @Param("method") HttpMethodType method,
            @Param("endpoint") String endpoint,
            @Param("env") Environment env,
            @Param("excludeId") UUID excludeId);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.transaction.annotation.Transactional
    @Query(value = "UPDATE mocks SET is_deleted = false WHERE id = :id", nativeQuery = true)
    void recoverMockNative(@Param("id") String id);

    @Query(value = "SELECT * FROM mocks WHERE is_deleted = true ORDER BY updated_at DESC", nativeQuery = true)
    List<Mock> findDeletedMocksNative();
}
