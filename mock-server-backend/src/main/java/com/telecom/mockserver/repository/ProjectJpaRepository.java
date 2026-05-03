package com.telecom.mockserver.repository;

import com.telecom.mockserver.model.Project;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface ProjectJpaRepository extends JpaRepository<Project, UUID> {
}

