import { ParamMap, Params } from '@angular/router';
import {
  LINES_OF_BUSINESS,
  LineOfBusiness,
  POLICY_STATUSES,
  PolicyFilter,
  PolicyStatus,
  REGIONS,
} from '../../core/models/policy.models';

/** Filter fields only (no paging/sort) — what the filter form edits. */
export type PolicyCriteria = Omit<PolicyFilter, 'page' | 'size' | 'sort'>;

export const DEFAULT_PAGE_SIZE = 20;
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

/** Fields the backend can sort by (JPA property names). */
export const SORTABLE_FIELDS = [
  'policyNumber',
  'policyholderName',
  'lineOfBusiness',
  'status',
  'premiumAmount',
  'region',
  'effectiveDate',
  'expiryDate',
  'flaggedForReview',
] as const;

const CRITERIA_KEYS = ['search', 'status', 'lineOfBusiness', 'region', 'effectiveDateFrom', 'effectiveDateTo'] as const;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Parses URL query params into an API query. Invalid or unknown values are dropped rather than sent,
 * so a hand-edited or stale bookmark degrades to "no filter" instead of a 400.
 */
export function queryFromParams(p: ParamMap): PolicyFilter {
  const oneOf = <T extends string>(key: string, allowed: readonly T[]): T | null => {
    const v = p.get(key);
    return v !== null && (allowed as readonly string[]).includes(v) ? (v as T) : null;
  };
  const date = (key: string): string | null => {
    const v = p.get(key);
    return v && ISO_DATE.test(v) && !Number.isNaN(Date.parse(v)) ? v : null;
  };
  const page = Number(p.get('page'));
  const size = Number(p.get('size'));
  const sort = p.get('sort');
  const [sortField, sortDir] = sort?.split(',') ?? [];

  return normalizeQuery({
    search: p.get('search')?.trim() || null,
    status: oneOf<PolicyStatus>('status', POLICY_STATUSES),
    lineOfBusiness: oneOf<LineOfBusiness>('lineOfBusiness', LINES_OF_BUSINESS),
    region: oneOf('region', REGIONS),
    effectiveDateFrom: date('effectiveDateFrom'),
    effectiveDateTo: date('effectiveDateTo'),
    page: Number.isInteger(page) && page > 0 ? page : 0,
    size: PAGE_SIZE_OPTIONS.includes(size) ? size : DEFAULT_PAGE_SIZE,
    sort:
      (SORTABLE_FIELDS as readonly string[]).includes(sortField) && (sortDir === 'asc' || sortDir === 'desc')
        ? `${sortField},${sortDir}`
        : null,
  });
}

/** Serialises a query to URL params, omitting blanks and defaults to keep bookmarks short. */
export function paramsFromQuery(q: PolicyFilter): Params {
  const n = normalizeQuery(q);
  const params: Params = {};
  for (const key of CRITERIA_KEYS) {
    if (n[key]) params[key] = n[key];
  }
  if (n.page) params['page'] = n.page;
  if (n.size !== DEFAULT_PAGE_SIZE) params['size'] = n.size;
  if (n.sort) params['sort'] = n.sort;
  return params;
}

/** Fills defaults and coerces blanks to null so two equivalent queries compare equal. */
export function normalizeQuery(q: PolicyFilter): Required<PolicyFilter> {
  return {
    ...normalizeCriteria(q),
    page: q.page ?? 0,
    size: q.size ?? DEFAULT_PAGE_SIZE,
    sort: q.sort || null,
  };
}

export function normalizeCriteria(c: PolicyCriteria): Required<PolicyCriteria> {
  return {
    search: c.search?.trim() || null,
    status: c.status || null,
    lineOfBusiness: c.lineOfBusiness || null,
    region: c.region || null,
    effectiveDateFrom: c.effectiveDateFrom || null,
    effectiveDateTo: c.effectiveDateTo || null,
  };
}

export function sameQuery(a: PolicyFilter, b: PolicyFilter): boolean {
  return JSON.stringify(normalizeQuery(a)) === JSON.stringify(normalizeQuery(b));
}

export function sameCriteria(a: PolicyCriteria, b: PolicyCriteria): boolean {
  return JSON.stringify(normalizeCriteria(a)) === JSON.stringify(normalizeCriteria(b));
}

export function hasCriteria(c: PolicyCriteria): boolean {
  return Object.values(normalizeCriteria(c)).some((v) => v !== null);
}
