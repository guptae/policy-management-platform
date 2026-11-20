package com.abc.policymanagement.infrastructure.persistence;

import com.abc.policymanagement.domain.model.LineOfBusiness;
import com.abc.policymanagement.domain.model.PolicyStatus;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDate;
import java.util.Locale;

/**
 * One Specification per filter field. Each returns null when its value is null, which
 * {@link Specification#where(Specification)} and {@link Specification#and(Specification)} treat as "no restriction".
 */
public final class PolicySpecifications {

    private PolicySpecifications() {
    }

    public static Specification<PolicyEntity> hasStatus(PolicyStatus status) {
        if (status == null) {
            return null;
        }
        return (root, query, cb) -> cb.equal(root.get("status"), status);
    }

    public static Specification<PolicyEntity> hasLineOfBusiness(LineOfBusiness lineOfBusiness) {
        if (lineOfBusiness == null) {
            return null;
        }
        return (root, query, cb) -> cb.equal(root.get("lineOfBusiness"), lineOfBusiness);
    }

    public static Specification<PolicyEntity> inRegion(String region) {
        if (region == null || region.isBlank()) {
            return null;
        }
        String normalized = region.trim().toLowerCase(Locale.ROOT);
        return (root, query, cb) -> cb.equal(cb.lower(root.get("region")), normalized);
    }

    public static Specification<PolicyEntity> effectiveOnOrAfter(LocalDate from) {
        if (from == null) {
            return null;
        }
        return (root, query, cb) -> cb.greaterThanOrEqualTo(root.get("effectiveDate"), from);
    }

    public static Specification<PolicyEntity> effectiveOnOrBefore(LocalDate to) {
        if (to == null) {
            return null;
        }
        return (root, query, cb) -> cb.lessThanOrEqualTo(root.get("effectiveDate"), to);
    }

    /** Case-insensitive contains-match on policy number or policyholder name. */
    public static Specification<PolicyEntity> matchesSearch(String search) {
        if (search == null || search.isBlank()) {
            return null;
        }
        String escaped = search.trim().toLowerCase(Locale.ROOT)
                .replace("\\", "\\\\")
                .replace("%", "\\%")
                .replace("_", "\\_");
        String pattern = "%" + escaped + "%";
        return (root, query, cb) -> cb.or(
                cb.like(cb.lower(root.get("policyNumber")), pattern, '\\'),
                cb.like(cb.lower(root.get("policyholderName")), pattern, '\\'));
    }
}
