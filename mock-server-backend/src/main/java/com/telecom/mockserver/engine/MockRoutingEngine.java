package com.telecom.mockserver.engine;

import com.telecom.mockserver.model.Environment;
import com.telecom.mockserver.model.HttpMethodType;
import com.telecom.mockserver.model.Mock;
import org.springframework.stereotype.Component;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import lombok.extern.slf4j.Slf4j;

import java.util.*;
import java.util.regex.*;
import java.util.stream.Collectors;

import org.springframework.util.AntPathMatcher;

@Component
@Slf4j
public class MockRoutingEngine {

    private final DynamicTemplateEngine dynamicTemplateEngine;
    private final JsonSubsetMatcher jsonSubsetMatcher;
    private final ObjectMapper objectMapper;

    //  Precompiled patterns (performance boost)
    private static final Pattern PLACEHOLDER_PATTERN = Pattern.compile("\\{\\s*[^}]+\\s*\\}");
    
    private final AntPathMatcher pathMatcher = new AntPathMatcher();

    public MockRoutingEngine(DynamicTemplateEngine dynamicTemplateEngine,
                             JsonSubsetMatcher jsonSubsetMatcher,
                             ObjectMapper objectMapper) {
        this.dynamicTemplateEngine = dynamicTemplateEngine;
        this.jsonSubsetMatcher = jsonSubsetMatcher;
        this.objectMapper = objectMapper;
    }

    public Optional<MockMatch> findBestMatchV2(
            List<Mock> candidates,
            String requestPath,
            HttpMethodType requestMethod,
            Map<String, String> requestQueryParams,
            Map<String, String> requestHeadersLower,
            JsonNode requestBody,
            Environment environment
    ) {
        if (requestPath == null) return Optional.empty();

        String normalizedPath = normalizePath(requestPath);

        log.debug("  RoutingEngine: matching {} {} [env={}] against {} candidates",
                requestMethod, normalizedPath, environment, candidates.size());

        // Step 1: Filter by environment
        List<Mock> envFiltered = candidates.stream()
                .filter(m -> m.getEnvironment() == environment)
                .collect(Collectors.toList());
        log.debug("  RoutingEngine: {} candidates after environment filter ({})", envFiltered.size(), environment);

        // Step 2: Filter by method
        List<Mock> methodFiltered = envFiltered.stream()
                .filter(m -> m.getMethod() == requestMethod)
                .collect(Collectors.toList());
        log.debug("  RoutingEngine: {} candidates after method filter ({})", methodFiltered.size(), requestMethod);

        if (methodFiltered.isEmpty()) {
            log.debug("  RoutingEngine: No candidates match environment+method, returning empty");
            return Optional.empty();
        }

        // Step 3: Try endpoint matching + query/header/body matching
        Optional<MockMatch> bestMatch = methodFiltered.stream()
                .map(m -> tryMatchEndpoint(m, normalizedPath))
                .filter(Optional::isPresent)
                .map(Optional::get)
                .filter(match -> matchesAll(match, requestQueryParams, requestHeadersLower, requestBody))
                .max(Comparator.comparingInt(MockMatch::getScore));

        if (bestMatch.isPresent()) {
            log.debug("  RoutingEngine: Best match found → mockId={}, endpoint={}, score={}",
                    bestMatch.get().getMock().getId(),
                    bestMatch.get().getMock().getEndpoint(),
                    bestMatch.get().getScore());
        } else {
            log.debug("  RoutingEngine: No match found after full evaluation");
        }

        return bestMatch;
    }

    //  SINGLE MATCH CHECK (clean approach)
    private boolean matchesAll(
            MockMatch match,
            Map<String, String> requestQueryParams,
            Map<String, String> requestHeadersLower,
            JsonNode requestBody
    ) {
        RequestContext ctx = RequestContext.builder()
                .pathParams(match.getPathParams())
                .queryParams(requestQueryParams)
                .headersLower(requestHeadersLower)
                .requestBody(requestBody)
                .build();

        Mock m = match.getMock();

        log.debug("    Testing mock: {} {} (env={}, id={})",
                m.getMethod(), m.getEndpoint(), m.getEnvironment(), m.getId());

        boolean qMatch = matchesQueryParams(m, ctx);
        log.debug("      Query match: {}", qMatch);
        if (!qMatch) return false;

        boolean hMatch = matchesHeaders(m, ctx);
        log.debug("      Header match: {}", hMatch);
        if (!hMatch) return false;

        boolean bMatch = matchesRequestBody(m, ctx);
        log.debug("      Body match: {}", bMatch);
        if (!bMatch) return false;

        log.debug("      ✓ ALL MATCHED for mockId={}", m.getId());
        return true;
    }

    // =========================
    //  ENDPOINT MATCHING
    // =========================

    private Optional<MockMatch> tryMatchEndpoint(Mock m, String requestPath) {
        String endpointTemplate = m.getEndpoint();
        if (endpointTemplate == null) return Optional.empty();

        if (endpointTemplate.startsWith("regex:")) {
            String regex = endpointTemplate.substring("regex:".length());
            if (!Pattern.compile(regex).matcher(requestPath).matches()) return Optional.empty();

            return Optional.of(MockMatch.builder()
                    .mock(m)
                    .pathParams(Map.of())
                    .score(specificityScore(endpointTemplate))
                    .build());
        }

        String normalizedTemplate = normalizePath(endpointTemplate);

        if (!pathMatcher.match(normalizedTemplate, requestPath)) {
            return Optional.empty();
        }

        // Extract path params — wrap in mutable HashMap for safe downstream usage
        Map<String, String> extracted = new HashMap<>(
                pathMatcher.extractUriTemplateVariables(normalizedTemplate, requestPath));
        if (!extracted.isEmpty()) {
            log.debug("    Path params extracted: {}", extracted);
        }

        int score = specificityScore(endpointTemplate)
                + (m.getQueryParams() == null ? 0 : m.getQueryParams().size() * 5)
                + (m.getHeaders() == null ? 0 : m.getHeaders().size() * 5)
                + (m.getRequestBody() == null ? 0 : 50);

        return Optional.of(MockMatch.builder()
                .mock(m)
                .pathParams(extracted)
                .score(score)
                .build());
    }

    // =========================
    //  MATCH LOGIC
    // =========================

    private boolean matchesQueryParams(Mock m, RequestContext ctx) {
        Map<String, String> expected = m.getQueryParams();
        if (expected == null || expected.isEmpty()) return true;

        for (Map.Entry<String, String> entry : expected.entrySet()) {
            String key = entry.getKey();
            String actual = ctx.safeQueryParams().get(key);

            String expectedVal = resolveExpected(entry.getValue(), ctx);

            if (key == null || actual == null || expectedVal == null) return false;
            if (!expectedVal.equals(actual)) return false;
        }

        return true;
    }

    private boolean matchesHeaders(Mock m, RequestContext ctx) {
        Map<String, String> expected = m.getHeaders();
        if (expected == null || expected.isEmpty()) return true;

        for (Map.Entry<String, String> entry : expected.entrySet()) {
            String key = entry.getKey().toLowerCase();
            String actual = ctx.safeHeadersLower().get(key);

            String expectedVal = resolveExpected(entry.getValue(), ctx);

            if (actual == null || expectedVal == null) return false;
            if (!expectedVal.equals(actual)) return false;
        }

        return true;
    }

    private boolean matchesRequestBody(Mock m, RequestContext ctx) {
        String expectedRaw = m.getRequestBody();

        if (expectedRaw == null || expectedRaw.isBlank()) return true;
        if (!ctx.hasBody()) {
            log.debug("      Body match: mock requires body but request has none");
            return false;
        }

        try {
            JsonNode expectedTemplate = objectMapper.readTree(expectedRaw);
            JsonNode resolved = dynamicTemplateEngine.applyToJson(expectedTemplate, ctx);

            boolean match = jsonSubsetMatcher.matches(resolved, ctx.getRequestBody());
            log.debug("      Body subset match result: {}", match);
            return match;
        } catch (Exception e) {
            log.warn("Body match failed for mockId={}: {}", m.getId(), e.getMessage());
            return false;
        }
    }

    private String resolveExpected(String raw, RequestContext ctx) {
        if (raw == null) return null;

        JsonNode node = dynamicTemplateEngine.applyToJson(
                JsonNodeFactory.instance.textNode(raw),
                ctx
        );

        return node == null || node.isNull() ? null : node.asText();
    }

    // =========================
    //  HELPERS
    // =========================

    private int specificityScore(String endpoint) {
        if (endpoint == null) return 0;

        int placeholders = countPlaceholders(endpoint);
        return endpoint.length() - placeholders * 10;
    }

    private int countPlaceholders(String template) {
        Matcher m = PLACEHOLDER_PATTERN.matcher(template);
        int count = 0;
        while (m.find()) count++;
        return count;
    }

    private String normalizePath(String path) {
        if (path == null || path.isBlank()) return "/";

        // Use URLDecoder with UTF-8 as requested
        String p = path.trim();
        try {
            p = java.net.URLDecoder.decode(p, java.nio.charset.StandardCharsets.UTF_8.name());
        } catch (Exception e) {
            // fallback if decode fails
        }

        if (!p.startsWith("/")) p = "/" + p;
        if (p.length() > 1 && p.endsWith("/")) {
            p = p.substring(0, p.length() - 1);
        }

        return p;
    }
}