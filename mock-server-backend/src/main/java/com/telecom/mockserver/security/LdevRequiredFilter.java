package com.telecom.mockserver.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * LdevRequiredFilter - DISABLED (mockserver.auth.enabled=false)
 * This filter only activates when mockserver.auth.enabled=true
 */
@Component
@ConditionalOnProperty(name = "mockserver.auth.enabled", havingValue = "true")
public class LdevRequiredFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        // Only active when auth is enabled
        filterChain.doFilter(request, response);
    }
}