package com.abc.policymanagement.service.port;

import com.abc.policymanagement.domain.model.LineOfBusiness;
import com.abc.policymanagement.domain.model.PolicyStatus;

import java.time.LocalDate;

/**
 * Optional search criteria for listing policies. A null field means "no restriction".
 */
public record PolicyFilter(
        PolicyStatus status,
        LineOfBusiness lineOfBusiness,
        String region,
        LocalDate effectiveDateFrom,
        LocalDate effectiveDateTo,
        String search) {
}
