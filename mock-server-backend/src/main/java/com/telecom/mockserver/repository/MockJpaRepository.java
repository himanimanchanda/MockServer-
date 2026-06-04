package com.telecom.mockserver.repository;

import com.telecom.mockserver.model.Environment;
import com.telecom.mockserver.model.HttpMethodType;
import com.telecom.mockserver.model.Mock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * JPA repository for {@link Mock} entity.
 *
 * <p>This repository is NOT used directly by services — access goes
 * through {@link com.telecom.mockserver.dao.MockDao}.</p>
 */
public interface MockJpaRepository extends JpaRepository<Mock, UUID> {

    /** Fetch all mocks ordered by latest-first */
    @Query("SELECT m FROM Mock m ORDER BY m.createdAt DESC, m.id DESC")
    List<Mock> findAllOrdered();

    /** Fetch mocks for a specific project, ordered consistently */
    @Query("SELECT m FROM Mock m WHERE m.projectId = :projectId ORDER BY m.createdAt DESC, m.id DESC")
    List<Mock> findByProjectIdOrdered(@Param("projectId") UUID projectId);

    List<Mock> findByProjectId(UUID projectId);

    void deleteByProjectId(UUID projectId);

    /** Duplicate detection: method + endpoint + environment must be unique */
    boolean existsByMethodAndEndpointAndEnvironment(
            HttpMethodType method, String endpoint, Environment environment);

    /** Duplicate check on update: exclude the mock being updated */
    @Query("SELECT COUNT(m) > 0 FROM Mock m WHERE m.method = :method AND m.endpoint = :endpoint AND m.environment = :env AND m.id <> :excludeId")
    boolean existsDuplicate(
            @Param("method") HttpMethodType method,
            @Param("endpoint") String endpoint,
            @Param("env") Environment env,
            @Param("excludeId") UUID excludeId);

    /** Recover a soft-deleted mock (bypasses @SQLRestriction) */
    @Modifying
    @Transactional
    @Query(value = "UPDATE mock_endpoints SET is_deleted = false WHERE id = :id", nativeQuery = true)
    void recoverMockNative(@Param("id") String id);

    /** Find all soft-deleted mocks (trash) — excludes permanently deleted */
    @Query(value = "SELECT * FROM mock_endpoints WHERE is_deleted = true AND is_permanently_deleted = false ORDER BY updated_at DESC", nativeQuery = true)
    List<Mock> findDeletedMocksNative();

    /** Find a soft-deleted mock by ID (bypasses @SQLRestriction, excludes permanently deleted) */
    @Query(value = "SELECT * FROM mock_endpoints WHERE id = :id AND is_deleted = true AND is_permanently_deleted = false", nativeQuery = true)
    Optional<Mock> findDeletedMockById(@Param("id") String id);

    /** Permanent soft-delete — sets is_permanently_deleted = true, data stays in DB forever */
    @Modifying
    @Transactional
    @Query(value = "UPDATE mock_endpoints SET is_permanently_deleted = true WHERE id = :id", nativeQuery = true)
    void permanentlyDeleteById(@Param("id") String id);

    /** Find a permanently deleted mock by ID (for audit/archive lookup) */
    @Query(value = "SELECT * FROM mock_endpoints WHERE id = :id AND is_permanently_deleted = true", nativeQuery = true)
    Optional<Mock> findPermanentlyDeletedById(@Param("id") String id);
}
