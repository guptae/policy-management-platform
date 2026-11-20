package com.abc.policymanagement.api.dto;

import java.math.BigDecimal;
import java.util.Map;

/**
 * Aggregate figures. Keys are display labels ("Active", "A&amp;H"). Premiums are reported per currency
 * and are never summed across currencies.
 */
public record PolicySummaryResponse(
        long totalPolicies,
        Map<String, Long> countByStatus,
        Map<String, Map<String, BigDecimal>> totalPremiumByLineOfBusiness,
        long expiringSoonCount) {
}
