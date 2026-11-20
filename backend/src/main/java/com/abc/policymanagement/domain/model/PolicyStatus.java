package com.abc.policymanagement.domain.model;

public enum PolicyStatus {
    ACTIVE("Active"),
    EXPIRED("Expired"),
    PENDING("Pending"),
    CANCELLED("Cancelled");

    private final String label;

    PolicyStatus(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }

    public static PolicyStatus fromLabel(String label) {
        for (PolicyStatus value : values()) {
            if (value.label.equals(label)) {
                return value;
            }
        }
        throw new IllegalArgumentException("Unknown policy status: " + label);
    }
}
