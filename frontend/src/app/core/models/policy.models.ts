/** API display labels — the backend accepts and returns these, not the Java enum names. */
export const POLICY_STATUSES = ['Active', 'Expired', 'Pending', 'Cancelled'] as const;
export type PolicyStatus = (typeof POLICY_STATUSES)[number];

export const LINES_OF_BUSINESS = ['Property', 'Casualty', 'A&H', 'Marine'] as const;
export type LineOfBusiness = (typeof LINES_OF_BUSINESS)[number];

/** Regions present in the seeded data set (the API accepts any string; the UI offers these). */
export const REGIONS = [
  'Australia',
  'Hong Kong',
  'Indonesia',
  'Japan',
  'Malaysia',
  'Philippines',
  'Singapore',
  'Thailand',
] as const;

/** Mirrors backend PolicyResponse. */
export interface Policy {
  id: string;
  policyNumber: string;
  policyholderName: string;
  status: PolicyStatus;
  lineOfBusiness: LineOfBusiness;
  premiumAmount: number;
  currency: string;
  effectiveDate: string; // ISO date (yyyy-MM-dd)
  expiryDate: string; // ISO date (yyyy-MM-dd)
  region: string;
  underwriter: string;
  flaggedForReview: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Query parameters for GET /api/v1/policies. All optional; page is zero-based. */
export interface PolicyFilter {
  status?: PolicyStatus | null;
  lineOfBusiness?: LineOfBusiness | null;
  region?: string | null;
  effectiveDateFrom?: string | null; // yyyy-MM-dd
  effectiveDateTo?: string | null; // yyyy-MM-dd
  search?: string | null;
  page?: number;
  size?: number;
  sort?: string | null; // e.g. "premiumAmount,desc"
}

/** Mirrors backend PagedPolicyResponse. */
export interface PagedResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

/** Mirrors backend BulkFlagResponse: outcome per id, "updated" or "not_found". */
export interface BulkFlagResponse {
  results: Record<string, 'updated' | 'not_found'>;
}

/** Mirrors backend PolicySummaryResponse. Premiums are per currency and never summed across currencies. */
export interface PolicySummary {
  totalPolicies: number;
  countByStatus: Record<string, number>;
  totalPremiumByLineOfBusiness: Record<string, Record<string, number>>;
  expiringSoonCount: number;
}

/** RFC 7807 ProblemDetail as returned by the backend. */
export interface ProblemDetail {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
  errors?: { field: string; message: string }[];
}
