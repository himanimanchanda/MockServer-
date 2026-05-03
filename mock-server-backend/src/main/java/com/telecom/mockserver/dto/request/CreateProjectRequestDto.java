package com.telecom.mockserver.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateProjectRequestDto {
    @NotBlank
    private String name;
}
