package com.abc.policymanagement.api.dto;

import jakarta.validation.constraints.NotEmpty;

import java.util.List;
import java.util.UUID;

public record BulkFlagRequest(@NotEmpty List<UUID> policyIds) {
}
