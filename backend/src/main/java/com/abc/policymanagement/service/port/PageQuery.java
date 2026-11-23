package com.abc.policymanagement.service.port;

/**
 * Framework-free paging and sorting request.
 *
 * @param page          zero-based page index (must be &gt;= 0)
 * @param size          page size (1..{@value #MAX_SIZE})
 * @param sortProperty  API property name to sort by, or {@code null} for no explicit ordering
 * @param ascending     sort direction; ignored when {@code sortProperty} is {@code null}
 */
public record PageQuery(int page, int size, String sortProperty, boolean ascending) {

    public static final int DEFAULT_SIZE = 20;
    public static final int MAX_SIZE = 2000;

    public PageQuery {
        if (page < 0) {
            throw new IllegalArgumentException("page must be >= 0");
        }
        if (size < 1 || size > MAX_SIZE) {
            throw new IllegalArgumentException("size must be between 1 and " + MAX_SIZE);
        }
        if (sortProperty != null && sortProperty.isBlank()) {
            sortProperty = null;
        }
    }

    public static PageQuery unsorted(int page, int size) {
        return new PageQuery(page, size, null, true);
    }
}
