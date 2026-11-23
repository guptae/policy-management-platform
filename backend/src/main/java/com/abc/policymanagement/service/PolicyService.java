package com.abc.policymanagement.service;

import com.abc.policymanagement.domain.model.Policy;
import com.abc.policymanagement.service.port.PageQuery;
import com.abc.policymanagement.service.port.PageResult;
import com.abc.policymanagement.service.port.PolicyFilter;
import com.abc.policymanagement.service.port.PolicyRepository;
import com.abc.policymanagement.service.port.PolicySummary;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class PolicyService {

    private final PolicyRepository policyRepository;

    public PolicyService(PolicyRepository policyRepository) {
        this.policyRepository = policyRepository;
    }

    public PageResult<Policy> findAll(PolicyFilter filter, PageQuery query) {
        return policyRepository.findAll(filter, query);
    }

    public Policy findById(UUID id) {
        return policyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Policy not found: " + id));
    }

    public Map<UUID, String> flagForReview(List<UUID> ids) {
        if (ids == null || ids.isEmpty()) {
            throw new IllegalArgumentException("policyIds must not be empty");
        }
        return policyRepository.flagForReview(ids);
    }

    public PolicySummary getSummary() {
        return policyRepository.getSummary();
    }
}
