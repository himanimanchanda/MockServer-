package com.telecom.mockserver.engine;

import com.telecom.mockserver.exception.BadRequestException;
import com.telecom.mockserver.model.Environment;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Component
public class EnvironmentResolver {
    private static final String ENV_HEADER = "X-Environment";
    private static final String ENV_QUERY_PARAM = "env";

    public Environment resolve(HttpServletRequest request) {
        String raw = Optional.ofNullable(request.getHeader(ENV_HEADER))
                .filter(s -> !s.isBlank())
                .orElse(request.getParameter(ENV_QUERY_PARAM));

        if (raw == null || raw.isBlank()) {
            return Environment.DEV;
        }

        try {
            return Environment.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new BadRequestException("Invalid environment '" + raw + "'. Allowed: DEV, QA, PROD");
        }
    }
}

