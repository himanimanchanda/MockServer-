package com.telecom.mockserver.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class RegisterRequest {
    @NotBlank
    private String olmId;

    @NotBlank
    @Email
    private String email;

    @NotBlank
    private String password;
}
