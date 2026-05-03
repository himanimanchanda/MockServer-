package com.telecom.mockserver.model;

import com.fasterxml.jackson.annotation.JsonCreator;

public enum HttpMethodType {
    GET,
    POST,
    PUT,
    PATCH,
    DELETE;

    @JsonCreator
    public static HttpMethodType fromString(String value) {
        if (value == null) {
            throw new IllegalArgumentException("HTTP method must not be null");
        }
        return HttpMethodType.valueOf(value.trim().toUpperCase());
    }
}

