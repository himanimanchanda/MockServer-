package com.telecom.mockserver.repository;

import com.telecom.mockserver.model.RequestLog;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface RequestLogJpaRepository extends JpaRepository<RequestLog, Long> {

    @Query("select rl from RequestLog rl order by rl.timestamp desc")
    List<RequestLog> findLatest(Pageable pageable);

    @Query("select rl from RequestLog rl where rl.endpoint like :pattern order by rl.timestamp desc")
    List<RequestLog> findByEndpointContaining(@Param("pattern") String pattern, Pageable pageable);
}
