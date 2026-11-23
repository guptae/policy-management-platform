package com.abc.policymanagement.service.port;

import java.util.List;

/** Framework-free page of results. */
public record PageResult<T>(List<T> content, int page, int size, long totalElements, int totalPages) {

    public PageResult {
        content = List.copyOf(content);
    }
}
