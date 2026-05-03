package com.telecom.mockserver.engine;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.TextNode;
import com.fasterxml.jackson.databind.node.NullNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.IntNode;
import com.fasterxml.jackson.databind.node.DoubleNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Iterator;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class DynamicTemplateEngine {

    private static final Pattern SINGLE_PLACEHOLDER_BRACES = Pattern.compile("^\\{\\s*([^}]+)\\s*}$");
    private static final Pattern SINGLE_PLACEHOLDER_DOUBLE = Pattern.compile("^\\{\\{\\s*([^}]+)\\s*}}$");
    private static final Pattern ANY_PLACEHOLDER_EITHER =
            Pattern.compile("(\\{\\{\\s*([^}]+)\\s*}})|(\\{\\s*([^}]+)\\s*})|(\\$\\.([a-zA-Z0-9_.]+))");

    // Precompiled patterns for built-in functions (perf: compiled once, used per-request)
    private static final Pattern RANDOM_STRING_PATTERN =
            Pattern.compile("randomString\\(\\s*(\\d+)\\s*,\\s*(\\d+)\\s*\\)");
    private static final Pattern RANDOM_INT_PATTERN =
            Pattern.compile("randomInt\\(\\s*(-?\\d+)\\s*,\\s*(-?\\d+)\\s*\\)");
    private static final Pattern RANDOM_FLOAT_PATTERN =
            Pattern.compile("randomFloat\\(\\s*(-?[\\d.]+)\\s*,\\s*(-?[\\d.]+)\\s*\\)");
    private static final String RANDOM_CHARS =
            "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

    private final ObjectMapper objectMapper;

    public DynamicTemplateEngine(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public JsonNode applyToJson(JsonNode template, RequestContext ctx) {
        if (template == null || template.isNull()) {
            return NullNode.getInstance();
        }

        if (template.isTextual()) {
            String raw = template.asText();

            if (raw.startsWith("$.")) {
                Optional<JsonNode> direct = resolveExpression(raw, ctx);
                if (direct.isPresent()) {
                    return direct.get();
                }
            }

            Matcher singleDouble = SINGLE_PLACEHOLDER_DOUBLE.matcher(raw);
            if (singleDouble.matches()) {
                String expr = singleDouble.group(1);
                return resolveExpression(expr, ctx).orElse(template);
            }

            Matcher singleBraces = SINGLE_PLACEHOLDER_BRACES.matcher(raw);
            if (singleBraces.matches()) {
                String expr = singleBraces.group(1);
                return resolveExpression(expr, ctx).orElse(template);
            }

            Matcher m = ANY_PLACEHOLDER_EITHER.matcher(raw);
            if (!m.find()) return template;

            StringBuffer sb = new StringBuffer();
            m.reset();

            while (m.find()) {
                String expr = m.group(2) != null ? m.group(2) : (m.group(4) != null ? m.group(4) : m.group(6));

                Optional<JsonNode> resolved = resolveExpression(expr, ctx);

                String replacement = resolved
                        .map(JsonNode::asText)
                        .orElse(m.group(0));

                m.appendReplacement(sb, Matcher.quoteReplacement(replacement));
            }

            m.appendTail(sb);
            return new TextNode(sb.toString());
        }

        if (template.isObject()) {
            ObjectNode out = objectMapper.createObjectNode();
            Iterator<Map.Entry<String, JsonNode>> fields = template.fields();

            while (fields.hasNext()) {
                Map.Entry<String, JsonNode> e = fields.next();
                out.set(e.getKey(), applyToJson(e.getValue(), ctx));
            }

            return out;
        }

        if (template.isArray()) {
            ArrayNode out = objectMapper.createArrayNode();

            for (JsonNode item : template) {
                out.add(applyToJson(item, ctx));
            }

            return out;
        }

        return template;
    }

    public String resolveExpressionToString(String expr, RequestContext ctx) {
        return resolveExpression(expr, ctx)
                .map(JsonNode::asText)
                .orElse(null);
    }

    public Optional<JsonNode> resolveExpression(String expr, RequestContext ctx) {
        if (expr == null) return Optional.empty();

        String trimmed = expr.trim();
        if (trimmed.isEmpty()) return Optional.empty();

        if (trimmed.startsWith("$.")) {
            String rest = trimmed.substring(2);
            if (rest.startsWith("body.")) {
                String path = rest.substring("body.".length());
                if (!ctx.hasBody()) {
                    return Optional.of(NullNode.getInstance());
                }
                JsonNode node = resolveJsonPath(ctx.getRequestBody(), path);
                return Optional.of(node == null ? NullNode.getInstance() : node.deepCopy());
            }
            if (rest.startsWith("header.")) {
                String key = rest.substring("header.".length()).toLowerCase();
                String v = ctx.safeHeadersLower().get(key);
                return Optional.of(v == null ? NullNode.getInstance() : new TextNode(v));
            }
            if (rest.startsWith("headers.")) {
                String key = rest.substring("headers.".length()).toLowerCase();
                String v = ctx.safeHeadersLower().get(key);
                return Optional.of(v == null ? NullNode.getInstance() : new TextNode(v));
            }
            if (rest.startsWith("query.")) {
                String key = rest.substring("query.".length());
                String v = ctx.safeQueryParams().get(key);
                return Optional.of(v == null ? NullNode.getInstance() : new TextNode(v));
            }
            if (rest.startsWith("path.")) {
                String key = rest.substring("path.".length());
                String v = ctx.safePathParams().get(key);
                return Optional.of(v == null ? NullNode.getInstance() : new TextNode(v));
            }
            // FIX: for $.uuid, $.now, $.randomInt(...), $.randomFloat(...), $.randomString(...)
            // strip the "$." prefix and resolve as built-in function
            return resolveExpression(rest, ctx);
        }

        // ===== BUILT-IN =====

        if (trimmed.equals("now")) {
            return Optional.of(new TextNode(Instant.now().toString()));
        }

        if (trimmed.equals("timestamp")) {
            return Optional.of(new TextNode(String.valueOf(System.currentTimeMillis())));
        }

        if (trimmed.equals("uuid")) {
            return Optional.of(new TextNode(UUID.randomUUID().toString()));
        }

        if (trimmed.startsWith("randomString")) {
            Matcher matcher = RANDOM_STRING_PATTERN.matcher(trimmed);
            if (matcher.find()) {
                int min = Integer.parseInt(matcher.group(1));
                int max = Integer.parseInt(matcher.group(2));
                int len = ThreadLocalRandom.current().nextInt(min, max + 1);

                StringBuilder sb = new StringBuilder(len);

                for (int i = 0; i < len; i++) {
                    sb.append(RANDOM_CHARS.charAt(ThreadLocalRandom.current().nextInt(RANDOM_CHARS.length())));
                }

                return Optional.of(new TextNode(sb.toString()));
            }
        }

        if (trimmed.startsWith("randomInt")) {
            Matcher matcher = RANDOM_INT_PATTERN.matcher(trimmed);
            if (matcher.find()) {
                int min = Integer.parseInt(matcher.group(1));
                int max = Integer.parseInt(matcher.group(2));
                int val = ThreadLocalRandom.current().nextInt(min, max + 1);

                return Optional.of(IntNode.valueOf(val));
            }
        }

        if (trimmed.startsWith("randomFloat")) {
            Matcher matcher = RANDOM_FLOAT_PATTERN.matcher(trimmed);
            if (matcher.find()) {
                double min = Double.parseDouble(matcher.group(1));
                double max = Double.parseDouble(matcher.group(2));
                if (min >= max) {
                    throw new IllegalArgumentException("randomFloat min must be less than max");
                }
                double val = min + ThreadLocalRandom.current().nextDouble() * (max - min);
                // Round to 2 decimal places
                val = Math.round(val * 100.0) / 100.0;

                return Optional.of(DoubleNode.valueOf(val));
            }
        }

        // ===== CONTEXT =====

        if (trimmed.startsWith("query.")) {
            String key = trimmed.substring("query.".length());
            String v = ctx.safeQueryParams().get(key);
            return Optional.of(v == null ? NullNode.getInstance() : new TextNode(v));
        }

        if (trimmed.startsWith("path.")) {
            String key = trimmed.substring("path.".length());
            String v = ctx.safePathParams().get(key);
            return Optional.of(v == null ? NullNode.getInstance() : new TextNode(v));
        }

        if (trimmed.startsWith("header.")) {
            String key = trimmed.substring("header.".length()).toLowerCase();
            String v = ctx.safeHeadersLower().get(key);
            return Optional.of(v == null ? NullNode.getInstance() : new TextNode(v));
        }
        
        if (trimmed.startsWith("headers.")) {
            String key = trimmed.substring("headers.".length()).toLowerCase();
            String v = ctx.safeHeadersLower().get(key);
            return Optional.of(v == null ? NullNode.getInstance() : new TextNode(v));
        }

        if (trimmed.startsWith("body.")) {
            String path = trimmed.substring("body.".length());

            if (!ctx.hasBody()) {
                return Optional.of(NullNode.getInstance());
            }

            JsonNode node = resolveJsonPath(ctx.getRequestBody(), path);
            return Optional.of(node == null ? NullNode.getInstance() : node.deepCopy());
        }

        String v = ctx.safePathParams().get(trimmed);
        return Optional.of(v == null ? NullNode.getInstance() : new TextNode(v));
    }

    /**
     * Resolves dotted paths with optional array indexes, e.g. {@code items[0].name} or {@code a.b.c}.
     */
    private JsonNode resolveJsonPath(JsonNode root, String path) {
        if (root == null || path == null || path.isEmpty()) {
            return null;
        }
        JsonNode cur = root;
        int i = 0;
        while (i < path.length()) {
            while (i < path.length() && path.charAt(i) == '.') {
                i++;
            }
            if (i >= path.length()) {
                break;
            }
            int bracket = path.indexOf('[', i);
            int dot = path.indexOf('.', i);
            int endField = bracket >= 0 && (dot < 0 || bracket < dot) ? bracket : (dot < 0 ? path.length() : dot);
            String field = path.substring(i, endField);
            if (field.isEmpty()) {
                return null;
            }
            cur = cur.get(field);
            if (cur == null) {
                return null;
            }
            i = endField;
            if (i < path.length() && path.charAt(i) == '[') {
                int close = path.indexOf(']', i);
                if (close < 0) {
                    return null;
                }
                String idxRaw = path.substring(i + 1, close).trim();
                try {
                    int idx = Integer.parseInt(idxRaw);
                    if (!cur.isArray()) {
                        return null;
                    }
                    cur = cur.get(idx);
                } catch (NumberFormatException ex) {
                    return null;
                }
                i = close + 1;
            }
        }
        return cur;
    }
}