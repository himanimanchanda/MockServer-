package com.telecom.mockserver.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class MigrateRequestDto {
    @NotNull
    private UUID fromProjectId;
    @NotNull
    private UUID toProjectId;
}
