package com.telecom.mockserver.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.telecom.mockserver.dto.response.ApiError;
import com.telecom.mockserver.dto.response.MockExecutionResult;
import com.telecom.mockserver.engine.EnvironmentResolver;
import com.telecom.mockserver.exception.BadRequestException;
import com.telecom.mockserver.model.Environment;
import com.telecom.mockserver.model.HttpMethodType;
import com.telecom.mockserver.service.MockService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequiredArgsConstructor
@Slf4j
@Order(Ordered.LOWEST_PRECEDENCE)
public class MockCatchAllController {

    private final MockService mockService;
    private final EnvironmentResolver environmentResolver;
    private final ObjectMapper objectMapper;

    /** System query parameter used for environment selection — must not pollute mock matching */
    private static final String ENV_QUERY_PARAM = "env";

    @RequestMapping(path = "/**")
    public ResponseEntity<?> handle(HttpServletRequest request) {

        // Decode percent-encoded path segments (e.g. %7B → {, %7D → })
        // Use URLDecoder with UTF-8 as requested
        String rawPath = request.getRequestURI();
        String decodedUri;
        try {
            decodedUri = java.net.URLDecoder.decode(rawPath, java.nio.charset.StandardCharsets.UTF_8.name());
        } catch (Exception e) {
            decodedUri = rawPath; // fallback to raw if parse fails
        }

        final String path = servletRelativePath(request, decodedUri);

        // Skip internal management routes — never treat them as mocks
        if (isSystemRoute(path)) {
            log.debug("CatchAll: skipping system route {}", path);
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }

        log.debug("═══════════════════════════════════════════════════");
        log.debug("▶ CatchAll request received: {} {}", request.getMethod(), path);

        // Parse HTTP method
        HttpMethodType method;
        try {
            method = HttpMethodType.fromString(request.getMethod());
        } catch (IllegalArgumentException ex) {
            log.warn("Unsupported HTTP method: {} for {}", request.getMethod(), path);
            ApiError error = ApiError.builder()
                    .timestamp(Instant.now())
                    .status(HttpStatus.METHOD_NOT_ALLOWED.value())
                    .error("Method Not Allowed")
                    .message("Unsupported HTTP method: " + request.getMethod())
                    .path(path)
                    .build();
            return ResponseEntity.status(HttpStatus.METHOD_NOT_ALLOWED).body(error);
        }

        // Resolve environment (from X-Environment header or ?env= param, defaults to DEV)
        Environment environment = environmentResolver.resolve(request);
        log.debug("  Environment resolved: {}", environment);

        // Query params — for form-urlencoded and multipart/form-data, getParameterMap()
        // merges body fields with URL query params, which pollutes mock matching.
        // Parse URL query string directly for these content types.
        Map<String, String> queryParams;
        boolean isFormUrlEncoded = request.getContentType() != null
                && request.getContentType().contains("application/x-www-form-urlencoded");
        boolean isMultipartFormData = request.getContentType() != null
                && request.getContentType().contains("multipart/form-data");

        if (isFormUrlEncoded || isMultipartFormData) {
            // Parse only the actual URL query string, excluding form body fields
            queryParams = parseQueryString(request.getQueryString());
        } else {
            queryParams = request.getParameterMap().entrySet().stream()
                    .filter(e -> !ENV_QUERY_PARAM.equalsIgnoreCase(e.getKey()))
                    .collect(Collectors.toMap(
                            Map.Entry::getKey,
                            e -> e.getValue() != null && e.getValue().length > 0 ? e.getValue()[0] : ""
                    ));
        }
        queryParams.remove(ENV_QUERY_PARAM);
        if (!queryParams.isEmpty()) {
            log.debug("  Query params (filtered): {}", queryParams);
        }

        // Headers (lowercased keys for case-insensitive matching)
        Map<String, String> headersLower = extractHeadersLower(request);
        log.debug("  Headers extracted: {} keys", headersLower.size());

        // Request body
        JsonNode requestBody = extractBody(request);
        if (requestBody != null) {
            log.debug("  Request body parsed: {} chars", requestBody.toString().length());
        } else {
            log.debug("  Request body: (empty)");
        }

        log.info("CatchAll: {} {} [env={}]", method, path, environment);

        MockExecutionResult mock = mockService.execute(
                path, method, queryParams, headersLower, requestBody, environment);

        log.debug("  Result: statusCode={}, mockId={}", mock.getStatusCode(), mock.getMatchedMockId());

        // Build response headers
        HttpHeaders responseHeaders = new HttpHeaders();

        if (mock.getResponseHeaders() != null) {
            mock.getResponseHeaders().forEach((k, v) -> {
                if (k != null && !k.isBlank()) responseHeaders.set(k, v);
            });
        }

        // Set Content-Type
        if (mock.getContentType() != null && !mock.getContentType().isBlank()) {
            responseHeaders.set(HttpHeaders.CONTENT_TYPE, mock.getContentType());
        } else if (!responseHeaders.containsKey(HttpHeaders.CONTENT_TYPE)) {
            responseHeaders.set(HttpHeaders.CONTENT_TYPE, "application/json");
        }

        log.info("CatchAll: Returning {} for {} {} [mockId={}]",
                mock.getStatusCode(), method, path, mock.getMatchedMockId());
        log.debug("═══════════════════════════════════════════════════");

        return ResponseEntity
                .status(mock.getStatusCode())
                .headers(responseHeaders)
                .body(mock.getResponseBody());
    }

    /**
     * These paths belong to the management API — never intercepted as mocks.
     * Only blocks specific internal endpoints, allowing users to create mocks like /api/v1/user.
     */
    private boolean isSystemRoute(String path) {
        return path.equals("/api/mocks") || path.startsWith("/api/mocks/")
                || path.equals("/api/logs") || path.startsWith("/api/logs/")
                || path.equals("/api/audit-logs") || path.startsWith("/api/audit-logs/")
                || path.equals("/audit-logs") || path.startsWith("/audit-logs/")
                || path.equals("/auth/login") || path.equals("/auth/register")
                || path.startsWith("/projects")
                || path.startsWith("/routes")
                || path.startsWith("/logs")
                || path.startsWith("/migrate")
                || path.startsWith("/actuator");
    }

    /**
     * Strips servlet context-path so mock routes match templates (e.g. context /api/v1 + mock /demo/... → /demo/...).
     */
    static String servletRelativePath(HttpServletRequest request, String decodedUri) {
        String ctx = request.getContextPath();
        if (ctx != null && !ctx.isEmpty() && decodedUri != null && decodedUri.startsWith(ctx)) {
            String remainder = decodedUri.substring(ctx.length());
            return remainder.isEmpty() ? "/" : remainder;
        }
        return decodedUri == null ? "/" : decodedUri;
    }

    private Map<String, String> extractHeadersLower(HttpServletRequest request) {
        Enumeration<String> names = request.getHeaderNames();
        if (names == null) return Map.of();
        return Collections.list(names).stream()
                .filter(n -> n != null && !n.isBlank())
                .collect(Collectors.toMap(
                        String::toLowerCase,
                        request::getHeader,
                        (a, b) -> a));
    }

    /**
     * Parses only the URL query string (not merged form body fields).
     * This is needed for form-urlencoded requests where getParameterMap()
     * merges both URL query params and form body fields.
     */
    private Map<String, String> parseQueryString(String queryString) {
        Map<String, String> params = new LinkedHashMap<>();
        if (queryString == null || queryString.isBlank()) return params;
        for (String pair : queryString.split("&")) {
            int eq = pair.indexOf('=');
            if (eq > 0) {
                try {
                    String key = java.net.URLDecoder.decode(pair.substring(0, eq), StandardCharsets.UTF_8.name());
                    String value = java.net.URLDecoder.decode(pair.substring(eq + 1), StandardCharsets.UTF_8.name());
                    params.put(key, value);
                } catch (Exception e) {
                    // skip malformed pair
                }
            }
        }
        return params;
    }

    private JsonNode extractBody(HttpServletRequest request) {
        try {
            String contentType = request.getContentType();

            // form-urlencoded: extract form body fields (exclude URL query params)
            if (contentType != null && contentType.contains("application/x-www-form-urlencoded")) {
                return extractFormFields(request);
            }

            // multipart/form-data: extract text part parameters as JSON
            if (contentType != null && contentType.contains("multipart/form-data")) {
                return extractFormFields(request);
            }

            byte[] bytes = request.getInputStream().readNBytes(1024 * 1024 + 1);
            if (bytes == null || bytes.length == 0) return null;
            if (bytes.length > 1024 * 1024) throw new BadRequestException("Request body too large (max 1MB)");
            String raw = new String(bytes, StandardCharsets.UTF_8).trim();
            if (raw.isEmpty()) return null;
            return objectMapper.readTree(raw);
        } catch (IOException e) {
            log.debug("  Body read failed (non-JSON or I/O error): {}", e.getMessage());
            return null; // non-JSON body is fine — routing engine handles it
        } catch (BadRequestException e) {
            throw e;
        } catch (Exception e) {
            log.debug("  Body parse failed (not valid JSON): {}", e.getMessage());
            // Don't throw — non-JSON bodies should still match mocks that don't require body matching
            return null;
        }
    }

    /**
     * Extracts form fields (from both form-urlencoded and multipart/form-data)
     * as a JSON ObjectNode, excluding URL query params and the env system param.
     */
    private JsonNode extractFormFields(HttpServletRequest request) {
        Set<String> urlQueryKeys = parseQueryString(request.getQueryString()).keySet();
        ObjectNode formBody = objectMapper.createObjectNode();
        request.getParameterMap().forEach((key, values) -> {
            if (values != null && values.length > 0
                    && !ENV_QUERY_PARAM.equalsIgnoreCase(key)
                    && !urlQueryKeys.contains(key)) {
                formBody.put(key, values[0]);
            }
        });
        return formBody.isEmpty() ? null : formBody;
    }
}