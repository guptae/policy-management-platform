package com.abc.policymanagement.infrastructure.persistence;

import com.abc.policymanagement.domain.model.LineOfBusiness;
import com.abc.policymanagement.domain.model.Policy;
import com.abc.policymanagement.domain.model.PolicyStatus;
import com.abc.policymanagement.service.InvalidQueryException;
import com.abc.policymanagement.service.port.PageQuery;
import com.abc.policymanagement.service.port.PageResult;
import com.abc.policymanagement.service.port.PolicyFilter;
import com.abc.policymanagement.service.port.PolicyRepository;
import com.abc.policymanagement.service.port.PolicySummary;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.EnumMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.TreeMap;
import java.util.UUID;

@Repository
public class PolicyRepositoryAdapter implements PolicyRepository {

    static final String UPDATED = "updated";
    static final String NOT_FOUND = "not_found";
    private static final int EXPIRING_SOON_DAYS = 30;

    /**
     * API sort property → {@link PolicyEntity} property. The API contract is defined here, so renaming
     * an entity field only requires updating the right-hand side.
     */
    private static final Map<String, String> SORTABLE_PROPERTIES = Map.of(
            "policyNumber", "policyNumber",
            "policyholderName", "policyholderName",
            "lineOfBusiness", "lineOfBusiness",
            "status", "status",
            "premiumAmount", "premiumAmount",
            "region", "region",
            "effectiveDate", "effectiveDate",
            "expiryDate", "expiryDate",
            "flaggedForReview", "flaggedForReview");

    private final PolicyJpaRepository jpaRepository;

    public PolicyRepositoryAdapter(PolicyJpaRepository jpaRepository) {
        this.jpaRepository = jpaRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public PageResult<Policy> findAll(PolicyFilter filter, PageQuery query) {
        Pageable pageable = PageRequest.of(query.page(), query.size(), toSort(query));
        Page<PolicyEntity> page = jpaRepository.findAll(toSpecification(filter), pageable);
        return new PageResult<>(
                page.getContent().stream().map(PolicyRepositoryAdapter::toDomain).toList(),
                page.getNumber(),
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages());
    }

    /** Maps an API sort property to an entity property, rejecting anything not explicitly allowed. */
    private static Sort toSort(PageQuery query) {
        if (query.sortProperty() == null) {
            return Sort.unsorted();
        }
        String entityProperty = SORTABLE_PROPERTIES.get(query.sortProperty());
        if (entityProperty == null) {
            throw new InvalidQueryException("Unsupported sort property: " + query.sortProperty());
        }
        return query.ascending() ? Sort.by(entityProperty).ascending() : Sort.by(entityProperty).descending();
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<Policy> findById(UUID id) {
        return jpaRepository.findById(id).map(PolicyRepositoryAdapter::toDomain);
    }

    @Override
    @Transactional
    public Map<UUID, String> flagForReview(List<UUID> ids) {
        List<UUID> distinctIds = List.copyOf(new LinkedHashSet<>(ids));
        Set<UUID> existing = new HashSet<>(jpaRepository.findExistingIds(distinctIds));
        if (!existing.isEmpty()) {
            jpaRepository.bulkFlag(List.copyOf(existing), Instant.now());
        }
        Map<UUID, String> results = new LinkedHashMap<>();
        for (UUID id : distinctIds) {
            results.put(id, existing.contains(id) ? UPDATED : NOT_FOUND);
        }
        return results;
    }

    @Override
    @Transactional(readOnly = true)
    public PolicySummary getSummary() {
        Map<PolicyStatus, Long> countByStatus = new EnumMap<>(PolicyStatus.class);
        for (PolicyStatus status : PolicyStatus.values()) {
            countByStatus.put(status, 0L);
        }
        for (Object[] row : jpaRepository.countByStatus()) {
            countByStatus.put((PolicyStatus) row[0], ((Number) row[1]).longValue());
        }

        Map<LineOfBusiness, Map<String, BigDecimal>> premiumByLob = new EnumMap<>(LineOfBusiness.class);
        for (LineOfBusiness lob : LineOfBusiness.values()) {
            premiumByLob.put(lob, new TreeMap<>());
        }
        for (Object[] row : jpaRepository.totalPremiumByLobAndCurrency()) {
            premiumByLob.get((LineOfBusiness) row[0]).put((String) row[1], (BigDecimal) row[2]);
        }

        long expiringSoon = jpaRepository.countExpiringSoon(LocalDate.now().plusDays(EXPIRING_SOON_DAYS));
        return new PolicySummary(countByStatus, premiumByLob, expiringSoon);
    }

    private static Specification<PolicyEntity> toSpecification(PolicyFilter filter) {
        if (filter == null) {
            return Specification.where(null);
        }
        return Specification.where(PolicySpecifications.hasStatus(filter.status()))
                .and(PolicySpecifications.hasLineOfBusiness(filter.lineOfBusiness()))
                .and(PolicySpecifications.inRegion(filter.region()))
                .and(PolicySpecifications.effectiveOnOrAfter(filter.effectiveDateFrom()))
                .and(PolicySpecifications.effectiveOnOrBefore(filter.effectiveDateTo()))
                .and(PolicySpecifications.matchesSearch(filter.search()));
    }

    static Policy toDomain(PolicyEntity entity) {
        Policy policy = new Policy();
        policy.setId(entity.getId());
        policy.setPolicyNumber(entity.getPolicyNumber());
        policy.setPolicyholderName(entity.getPolicyholderName());
        policy.setLineOfBusiness(entity.getLineOfBusiness());
        policy.setStatus(entity.getStatus());
        policy.setPremiumAmount(entity.getPremiumAmount());
        policy.setCurrency(entity.getCurrency());
        policy.setEffectiveDate(entity.getEffectiveDate());
        policy.setExpiryDate(entity.getExpiryDate());
        policy.setRegion(entity.getRegion());
        policy.setUnderwriter(entity.getUnderwriter());
        policy.setFlaggedForReview(entity.isFlaggedForReview());
        policy.setCreatedAt(entity.getCreatedAt());
        policy.setUpdatedAt(entity.getUpdatedAt());
        return policy;
    }

    static PolicyEntity toEntity(Policy policy) {
        PolicyEntity entity = new PolicyEntity();
        entity.setId(policy.getId());
        entity.setPolicyNumber(policy.getPolicyNumber());
        entity.setPolicyholderName(policy.getPolicyholderName());
        entity.setLineOfBusiness(policy.getLineOfBusiness());
        entity.setStatus(policy.getStatus());
        entity.setPremiumAmount(policy.getPremiumAmount());
        entity.setCurrency(policy.getCurrency());
        entity.setEffectiveDate(policy.getEffectiveDate());
        entity.setExpiryDate(policy.getExpiryDate());
        entity.setRegion(policy.getRegion());
        entity.setUnderwriter(policy.getUnderwriter());
        entity.setFlaggedForReview(policy.isFlaggedForReview());
        entity.setCreatedAt(policy.getCreatedAt());
        entity.setUpdatedAt(policy.getUpdatedAt());
        return entity;
    }
}
