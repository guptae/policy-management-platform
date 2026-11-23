package com.abc.policymanagement.service.port;

import com.abc.policymanagement.domain.model.Policy;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Domain port for policy persistence. Implemented in the infrastructure layer.
 */
public interface PolicyRepository {

    /**
     * @throws com.abc.policymanagement.service.InvalidQueryException if {@code query.sortProperty()} is not a sortable API property
     */
    PageResult<Policy> findAll(PolicyFilter filter, PageQuery query);

    Optional<Policy> findById(UUID id);

    /**
     * Flags the given policies for review.
     *
     * @return outcome per requested id: "updated" or "not_found"
     */
    Map<UUID, String> flagForReview(List<UUID> ids);

    PolicySummary getSummary();
}
