package com.telecom.mockserver.dao;

import com.telecom.mockserver.model.User;

import java.util.Optional;

/**
 * Data Access Object for {@link User} entity.
 */
public interface UserDao {

    User save(User user);

    Optional<User> findByOlmId(String olmId);

    boolean existsByOlmId(String olmId);

    boolean existsByEmail(String email);
}
