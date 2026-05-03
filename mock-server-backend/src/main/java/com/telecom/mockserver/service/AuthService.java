package com.telecom.mockserver.service;

import com.telecom.mockserver.auth.LoginRequest;
import com.telecom.mockserver.dto.response.AuthResponse;

import com.telecom.mockserver.auth.RegisterRequest;

/**
 * Service interface for authentication operations.
 * Controller handles HTTP, this handles business logic.
 */
public interface AuthService {

    /**
     * Register a new user. Hashes the password and persists to DB.
     * @throws com.telecom.mockserver.exception.BadRequestException if OLM ID or email already exists
     */
    AuthResponse register(RegisterRequest request);

    /**
     * Login an existing user. Verifies password and issues JWT.
     * @throws com.telecom.mockserver.exception.BadRequestException if credentials are invalid
     */
    AuthResponse login(LoginRequest request);
}
