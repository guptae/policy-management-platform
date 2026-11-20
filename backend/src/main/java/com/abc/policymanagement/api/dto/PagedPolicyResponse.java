package com.abc.policymanagement.api.dto;

import java.util.List;

public record PagedPolicyResponse<T>(
        List<T> content,
        int page,
        int size,
        long totalElements,
        int totalPages) {
}
