package com.abc.policymanagement.service;

/**
 * A client-supplied query (paging/sorting/filter) is invalid. Deliberately not an
 * {@link IllegalArgumentException}: Spring's persistence exception translation rewrites those when thrown
 * from a {@code @Repository}, which would turn a 400 into a 500.
 */
public class InvalidQueryException extends RuntimeException {

    public InvalidQueryException(String message) {
        super(message);
    }
}
