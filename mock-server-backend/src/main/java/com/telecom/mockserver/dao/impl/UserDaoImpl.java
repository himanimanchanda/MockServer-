package com.telecom.mockserver.dao.impl;

import com.telecom.mockserver.dao.UserDao;
import com.telecom.mockserver.model.User;
import com.telecom.mockserver.repository.UserJpaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * JPA-backed implementation of {@link UserDao}.
 */
@Repository
@RequiredArgsConstructor
public class UserDaoImpl implements UserDao {

    private final UserJpaRepository repository;

    @Override
    public User save(User user) {
        return repository.save(user);
    }

    @Override
    public Optional<User> findByOlmId(String olmId) {
        return repository.findByOlmId(olmId);
    }

    @Override
    public boolean existsByOlmId(String olmId) {
        return repository.existsByOlmId(olmId);
    }

    @Override
    public boolean existsByEmail(String email) {
        return repository.existsByEmail(email);
    }
}
