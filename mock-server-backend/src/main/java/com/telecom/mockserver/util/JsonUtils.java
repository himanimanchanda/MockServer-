package com.telecom.mockserver.util;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.NullNode;
import com.telecom.mockserver.exception.JsonValidationException;
import org.springframework.stereotype.Component;

@Component
public class JsonUtils {
    private final ObjectMapper objectMapper;

    public JsonUtils(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    /**
     * Parse a raw JSON string to a JsonNode.
     * Returns NullNode if input is null or blank — prevents NPE in callers.
     */
    public JsonNode parseToJsonNode(String raw) {
        if (raw == null || raw.isBlank()) {
            return NullNode.getInstance();
        }
        try {
            return objectMapper.readTree(raw);
        } catch (JsonProcessingException e) {
            throw new JsonValidationException("Invalid JSON: " + e.getOriginalMessage());
        } catch (Exception e) {
            throw new JsonValidationException("Invalid JSON: " + e.getMessage());
        }
    }

    /**
     * Safely serialize an object to JSON string.
     * Returns null if serialization fails.
     */
    public String toJsonString(Object obj) {
        if (obj == null) return null;
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (Exception e) {
            return obj.toString();
        }
    }
}
