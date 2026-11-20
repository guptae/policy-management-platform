package com.abc.policymanagement.api.dto;

import java.util.Map;
import java.util.UUID;

/** Outcome per requested policy id: "updated" or "not_found". */
public record BulkFlagResponse(Map<UUID, String> results) {
}
