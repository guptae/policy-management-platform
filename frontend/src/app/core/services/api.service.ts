import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { HANDLE_ERROR_LOCALLY } from '../interceptors/error.interceptor';
import {
  BulkFlagResponse,
  PagedResponse,
  Policy,
  PolicyFilter,
  PolicySummary,
} from '../models/policy.models';

/** Thin HttpClient wrapper for every backend call. */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/v1/policies`;

  /**
   * @param options.handleErrorsLocally skip the global error alert because the caller shows its own
   *   error state (e.g. an inline banner with retry).
   */
  getPolicies(filters: PolicyFilter, options?: { handleErrorsLocally?: boolean }): Observable<PagedResponse<Policy>> {
    return this.http.get<PagedResponse<Policy>>(this.baseUrl, {
      params: toHttpParams(filters),
      context: new HttpContext().set(HANDLE_ERROR_LOCALLY, options?.handleErrorsLocally ?? false),
    });
  }

  getPolicyById(id: string): Observable<Policy> {
    return this.http.get<Policy>(`${this.baseUrl}/${encodeURIComponent(id)}`);
  }

  flagPolicies(ids: string[]): Observable<BulkFlagResponse> {
    return this.http.patch<BulkFlagResponse>(`${this.baseUrl}/flag`, { policyIds: ids });
  }

  /** Aggregates across all policies — independent of any list filters. */
  getSummary(options?: { handleErrorsLocally?: boolean }): Observable<PolicySummary> {
    return this.http.get<PolicySummary>(`${this.baseUrl}/summary`, {
      context: new HttpContext().set(HANDLE_ERROR_LOCALLY, options?.handleErrorsLocally ?? false),
    });
  }
}

/**
 * Builds query params, skipping null/blank values. HttpParams encodes each value, so "A&H" is sent
 * as "A%26H" rather than splitting the query string.
 */
export function toHttpParams(filters: PolicyFilter): HttpParams {
  let params = new HttpParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value === null || value === undefined) continue;
    const str = String(value).trim();
    if (str !== '') params = params.set(key, str);
  }
  return params;
}
