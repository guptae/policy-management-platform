CREATE TABLE policies (
    id                 UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_number      VARCHAR(20)    NOT NULL UNIQUE,
    policyholder_name  VARCHAR(255)   NOT NULL,
    line_of_business   VARCHAR(20)    NOT NULL,
    status             VARCHAR(20)    NOT NULL,
    premium_amount     NUMERIC(15, 2) NOT NULL,
    currency           VARCHAR(5)     NOT NULL,
    effective_date     DATE           NOT NULL,
    expiry_date        DATE           NOT NULL,
    region             VARCHAR(50)    NOT NULL,
    underwriter        VARCHAR(255)   NOT NULL,
    flagged_for_review BOOLEAN        NOT NULL DEFAULT FALSE,
    created_at         TIMESTAMPTZ    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMPTZ    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_policies_status           ON policies (status);
CREATE INDEX idx_policies_line_of_business ON policies (line_of_business);
CREATE INDEX idx_policies_region           ON policies (region);
CREATE INDEX idx_policies_effective_date   ON policies (effective_date);
