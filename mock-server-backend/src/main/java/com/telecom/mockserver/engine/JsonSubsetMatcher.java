package com.telecom.mockserver.engine;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.stereotype.Component;

/**
 * Matches JSON by treating objects as "expected fields must exist and match".
 * Extra fields in actual are allowed.
 *
 * Special wildcard: if expected value is "$", it matches any non-null actual
 * value (the field just needs to exist). This is the convention used by the
 * mock creation form to mark "variable" request-body fields.
 */
@Component
public class JsonSubsetMatcher {

    /** "$" in the expected template means "match any value, just must be present". */
    private static final String WILDCARD = "$";

    public boolean matches(JsonNode expected, JsonNode actual) {
        if (expected == null || expected.isNull()) {
            return actual == null || actual.isNull();
        }
        if (actual == null || actual.isNull()) return false;

        // Wildcard — "$" or any value starting with "$" or containing "{{...}}" matches any non-null actual value
        if (expected.isTextual()) {
            String text = expected.asText();
            if (WILDCARD.equals(text) || text.startsWith("$") || text.contains("{{")) {
                return true; // actual is already non-null (checked above)
            }
        }

        if (expected.isObject()) {
            if (!actual.isObject()) return false;
            for (var it = expected.fields(); it.hasNext(); ) {
                var e = it.next();
                JsonNode actualChild = actual.get(e.getKey());
                if (!matches(e.getValue(), actualChild)) {
                    return false;
                }
            }
            return true;
        }

        if (expected.isArray()) {
            // Keep array semantics strict for now.
            return expected.equals(actual);
        }

        return expected.equals(actual);
    }
}

