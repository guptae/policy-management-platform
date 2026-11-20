package com.abc.policymanagement.api.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * API representation of a policy. {@code status} and {@code lineOfBusiness} carry display labels
 * (e.g. "Active", "A&amp;H"), not Java enum names.
 */
public record PolicyResponse(
        UUID id,
        String policyNumber,
        String policyholderName,
        String status,
        String lineOfBusiness,
        BigDecimal premiumAmount,
        String currency,
        LocalDate effectiveDate,
        LocalDate expiryDate,
        String region,
        String underwriter,
        boolean flaggedForReview,
        Instant createdAt,
        Instant updatedAt) {
}
