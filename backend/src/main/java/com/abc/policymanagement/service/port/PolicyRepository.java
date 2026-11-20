package com.abc.policymanagement.service.port;

import com.abc.policymanagement.domain.model.Policy;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Domain port for policy persistence. Implemented in the infrastructure layer.
 */
public interface PolicyRepository {

    Page<Policy> findAll(PolicyFilter filter, Pageable pageable);

    Optional<Policy> findById(UUID id);

    /**
     * Flags the given policies for review.
     *
     * @return outcome per requested id: "updated" or "not_found"
     */
    Map<UUID, String> flagForReview(List<UUID> ids);

    PolicySummary getSummary();
}
