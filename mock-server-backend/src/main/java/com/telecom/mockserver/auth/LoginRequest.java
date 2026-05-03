package com.telecom.mockserver.auth;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class LoginRequest {
    @NotBlank
    private String olmId;

    @NotBlank
    private String password;
}

