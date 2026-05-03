package com.telecom.mockserver.dto.request;

import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * Update payload is identical to create payload.
 * Keeps API usage consistent and validation centralized.
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class UpdateMockRequestDto extends CreateMockRequestDto {

}
