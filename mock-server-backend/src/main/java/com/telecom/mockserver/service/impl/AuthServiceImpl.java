package com.telecom.mockserver.service.impl;

import com.telecom.mockserver.auth.JwtService;
import com.telecom.mockserver.auth.RegisterRequest;
import com.telecom.mockserver.auth.LoginRequest;
import com.telecom.mockserver.dto.response.AuthResponse;
import com.telecom.mockserver.exception.BadRequestException;
import com.telecom.mockserver.model.User;
import com.telecom.mockserver.dao.UserDao;
import com.telecom.mockserver.service.AuthService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthServiceImpl implements AuthService {

    private final UserDao userDao;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String olmId = request.getOlmId().trim().toLowerCase();
        String email = request.getEmail().trim().toLowerCase();

        if (userDao.existsByOlmId(olmId)) {
            throw new BadRequestException("OLM ID already exists: " + olmId);
        }
        if (userDao.existsByEmail(email)) {
            throw new BadRequestException("Email already exists: " + email);
        }

        User user = User.builder()
                .id(UUID.randomUUID())
                .olmId(olmId)
                .email(email)
                .password(passwordEncoder.encode(request.getPassword()))
                .createdAt(java.time.Instant.now())
                .build();

        userDao.save(user);
        log.info("User registered: {}", olmId);

        String token = jwtService.issueToken(olmId);

        return AuthResponse.builder()
                .token(token)
                .userId(user.getId())
                .olmId(user.getOlmId())
                .createdAt(user.getCreatedAt())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        String olmId = request.getOlmId().trim().toLowerCase();

        User user = userDao.findByOlmId(olmId)
                .orElseThrow(() -> new BadRequestException("Invalid OLM ID or password"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new BadRequestException("Invalid OLM ID or password");
        }

        log.info("User logged in: {}", olmId);

        String token = jwtService.issueToken(olmId);

        return AuthResponse.builder()
                .token(token)
                .userId(user.getId())
                .olmId(user.getOlmId())
                .createdAt(user.getCreatedAt())
                .build();
    }
}
