import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withHooks, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, catchError, firstValueFrom, pipe, switchMap, tap } from 'rxjs';
import { describeHttpError } from '../../core/interceptors/error.interceptor';
import { BulkFlagResponse, Policy, PolicyFilter } from '../../core/models/policy.models';
import { ApiService } from '../../core/services/api.service';
import { DEFAULT_PAGE_SIZE, PolicyCriteria, normalizeCriteria, normalizeQuery, sameQuery } from './policy-query-params';

export type { PolicyCriteria } from './policy-query-params';

interface PolicyState {
  criteria: PolicyCriteria;
  page: number;
  size: number;
  sort: string | null;
  policies: Policy[];
  totalElements: number;
  loading: boolean;
  /** Set when the last list fetch failed; rendered inline with a retry action. */
  error: { title: string; message: string } | null;
  selectedIds: string[];
  flagging: boolean;
}

const initialState: PolicyState = {
  criteria: normalizeCriteria({}),
  page: 0,
  size: DEFAULT_PAGE_SIZE,
  sort: null,
  policies: [],
  totalElements: 0,
  loading: false,
  error: null,
  selectedIds: [],
  flagging: false,
};

/**
 * State for the policies dashboard. The URL is the source of truth for the query: the list component
 * pushes parsed query params in via `setQuery`, and any change to the query triggers a fetch.
 */
export const PolicyStore = signalStore(
  withState(initialState),
  withComputed(({ criteria, page, size, sort, selectedIds }) => ({
    // Structural equality, so re-setting an identical query doesn't refetch.
    query: computed<PolicyFilter>(() => ({ ...criteria(), page: page(), size: size(), sort: sort() }), {
      equal: sameQuery,
    }),
    selectedCount: computed(() => selectedIds().length),
  })),
  withMethods((store, api = inject(ApiService)) => {
    const loadPolicies = rxMethod<PolicyFilter>(
      pipe(
        tap(() => patchState(store, { loading: true, error: null })),
        // switchMap cancels an in-flight request when the query changes again.
        switchMap((query) =>
          api.getPolicies(query, { handleErrorsLocally: true }).pipe(
            tap((res) =>
              patchState(store, { policies: res.content, totalElements: res.totalElements, loading: false }),
            ),
            catchError((err: unknown) => {
              patchState(store, { loading: false, error: describeHttpError(err), policies: [], totalElements: 0 });
              return EMPTY;
            }),
          ),
        ),
      ),
    );

    return {
      loadPolicies,
      setQuery(query: PolicyFilter): void {
        if (sameQuery(query, store.query())) return;
        const { page, size, sort, ...criteria } = normalizeQuery(query);
        // A different page or filter shows different rows, so the old selection no longer applies.
        patchState(store, { criteria, page, size, sort, selectedIds: [] });
      },
      /** Re-runs the current query (used by the error banner's retry). */
      reload(): void {
        loadPolicies(store.query());
      },
      toggleSelected(id: string): void {
        const ids = store.selectedIds();
        patchState(store, { selectedIds: ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id] });
      },
      setSelected(ids: string[]): void {
        patchState(store, { selectedIds: ids });
      },
      /**
       * Flags the given policies and marks the updated rows locally. Resolves to the API response,
       * or null on failure (the error interceptor shows the alert).
       */
      async flag(ids: string[]): Promise<BulkFlagResponse | null> {
        if (!ids.length || store.flagging()) return null;
        patchState(store, { flagging: true });
        try {
          const res = await firstValueFrom(api.flagPolicies(ids));
          const updated = new Set(
            Object.entries(res.results)
              .filter(([, r]) => r === 'updated')
              .map(([id]) => id),
          );
          patchState(store, {
            policies: store.policies().map((p) => (updated.has(p.id) ? { ...p, flaggedForReview: true } : p)),
            selectedIds: store.selectedIds().filter((id) => !ids.includes(id)),
          });
          return res;
        } catch {
          return null;
        } finally {
          patchState(store, { flagging: false });
        }
      },
    };
  }),
  withHooks({
    onInit(store) {
      store.loadPolicies(store.query);
    },
  }),
);
