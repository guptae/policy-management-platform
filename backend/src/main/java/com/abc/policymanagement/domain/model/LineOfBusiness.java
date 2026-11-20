package com.abc.policymanagement.domain.model;

public enum LineOfBusiness {
    PROPERTY("Property"),
    CASUALTY("Casualty"),
    AH("A&H"),
    MARINE("Marine");

    private final String label;

    LineOfBusiness(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }

    public static LineOfBusiness fromLabel(String label) {
        for (LineOfBusiness value : values()) {
            if (value.label.equals(label)) {
                return value;
            }
        }
        throw new IllegalArgumentException("Unknown line of business: " + label);
    }
}
