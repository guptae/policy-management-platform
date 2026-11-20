package com.abc.policymanagement.service.port;

import com.abc.policymanagement.domain.model.LineOfBusiness;
import com.abc.policymanagement.domain.model.PolicyStatus;

import java.math.BigDecimal;
import java.util.Map;

/**
 * Aggregate figures across all policies. Premiums are kept per currency, never summed across currencies.
 */
public record PolicySummary(
        Map<PolicyStatus, Long> countByStatus,
        Map<LineOfBusiness, Map<String, BigDecimal>> totalPremiumByLob,
        long expiringSoonCount) {
}
