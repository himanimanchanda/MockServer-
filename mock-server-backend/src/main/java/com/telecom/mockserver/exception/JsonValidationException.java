package com.telecom.mockserver.exception;

public class JsonValidationException extends BadRequestException {
    public JsonValidationException(String message) {
        super(message);
    }
}

