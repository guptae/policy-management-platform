package com.abc.policymanagement.api.mapper;

import com.abc.policymanagement.api.dto.PagedPolicyResponse;
import com.abc.policymanagement.api.dto.PolicyResponse;
import com.abc.policymanagement.api.dto.PolicySummaryResponse;
import com.abc.policymanagement.domain.model.LineOfBusiness;
import com.abc.policymanagement.domain.model.Policy;
import com.abc.policymanagement.domain.model.PolicyStatus;
import com.abc.policymanagement.service.port.PolicySummary;
import org.mapstruct.Mapper;
import org.springframework.data.domain.Page;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Maps between the domain and the API DTOs. Enums cross the API boundary as display labels.
 * The component model (spring) is set by the {@code -Amapstruct.defaultComponentModel} compiler arg.
 */
@Mapper
public interface PolicyMapper {

    PolicyResponse toResponse(Policy policy);

    Policy toDomain(PolicyResponse response);

    default PagedPolicyResponse<PolicyResponse> toPagedResponse(Page<Policy> page) {
        return new PagedPolicyResponse<>(
                page.getContent().stream().map(this::toResponse).toList(),
                page.getNumber(),
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages());
    }

    default PolicySummaryResponse toSummaryResponse(PolicySummary summary) {
        Map<String, Long> countByStatus = new LinkedHashMap<>();
        summary.countByStatus().forEach((status, count) -> countByStatus.put(status.getLabel(), count));
        long total = countByStatus.values().stream().mapToLong(Long::longValue).sum();

        Map<String, Map<String, BigDecimal>> premiumByLob = new LinkedHashMap<>();
        summary.totalPremiumByLob().forEach((lob, perCurrency) ->
                premiumByLob.put(lob.getLabel(), new LinkedHashMap<>(perCurrency)));

        return new PolicySummaryResponse(total, countByStatus, premiumByLob, summary.expiringSoonCount());
    }

    default String toLabel(PolicyStatus status) {
        return status == null ? null : status.getLabel();
    }

    default String toLabel(LineOfBusiness lineOfBusiness) {
        return lineOfBusiness == null ? null : lineOfBusiness.getLabel();
    }

    default PolicyStatus toStatus(String label) {
        return label == null ? null : PolicyStatus.fromLabel(label);
    }

    default LineOfBusiness toLineOfBusiness(String label) {
        return label == null ? null : LineOfBusiness.fromLabel(label);
    }
}
