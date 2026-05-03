package com.telecom.mockserver.repository;

import com.telecom.mockserver.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface UserJpaRepository extends JpaRepository<User, UUID> {

    Optional<User> findByOlmId(String olmId);

    boolean existsByOlmId(String olmId);
    
    boolean existsByEmail(String email);
}
