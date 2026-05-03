package com.telecom.mockserver.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Validates endpoint templates like:
 * - /users
 * - /users/{id}
 * - /users/{id}/posts/{postId}
 *
 * Rules:
 * - must start with '/'
 * - no whitespace
 * - dynamic params must be in {param} where param matches [A-Za-z_][A-Za-z0-9_]*
 */
public class ValidEndpointTemplateValidator implements ConstraintValidator<ValidEndpointTemplate, String> {
    private static final Pattern PLACEHOLDER = Pattern.compile("\\{\\s*([^}]+)\\s*}");
    private static final Pattern PARAM_NAME = Pattern.compile("^[A-Za-z_][A-Za-z0-9_]*$");

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        if (value == null) return true; // @NotBlank handles required
        String v = value.trim();
        if (v.isEmpty()) return true; // @NotBlank handles required
        if (!v.startsWith("/")) return false;
        if (v.chars().anyMatch(Character::isWhitespace)) return false;

        // Validate each {param} and reject nested braces or empty params.
        Matcher m = PLACEHOLDER.matcher(v);
        int lastEnd = 0;
        while (m.find()) {
            String inside = m.group(1);
            if (inside == null) return false;
            String name = inside.trim();
            if (name.isEmpty()) return false;
            if (name.contains("{") || name.contains("}")) return false;
            if (!PARAM_NAME.matcher(name).matches()) return false;
            lastEnd = m.end();
        }

        // Reject unmatched '}' or '{' characters outside placeholders.
        // Simplest approach: remove all valid placeholders then ensure no braces remain.
        String stripped = m.reset().replaceAll("");
        return stripped.indexOf('{') < 0 && stripped.indexOf('}') < 0;
    }
}

