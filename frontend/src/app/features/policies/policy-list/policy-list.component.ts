import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSortModule, Sort, SortDirection } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Policy, PolicyFilter } from '../../../core/models/policy.models';
import { ErrorAlertComponent } from '../../../shared/components/error-alert/error-alert.component';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { CurrencyFormatPipe } from '../../../shared/pipes/currency-format.pipe';
import { PolicyFilterComponent } from '../policy-filter/policy-filter.component';
import {
  PAGE_SIZE_OPTIONS,
  PolicyCriteria,
  hasCriteria,
  paramsFromQuery,
  queryFromParams,
} from '../policy-query-params';
import { PolicyStore } from '../policy.store';

/**
 * Policy table with filters, server-side paging/sorting, multi-select bulk flag and
 * loading / empty / error states. All query state lives in the URL so views are bookmarkable:
 * user actions navigate, and the store reacts to the resulting query params.
 */
@Component({
  selector: 'app-policy-list',
  imports: [
    DatePipe,
    MatButtonModule,
    MatCheckboxModule,
    MatIconModule,
    MatPaginatorModule,
    MatSnackBarModule,
    MatSortModule,
    MatTableModule,
    MatTooltipModule,
    CurrencyFormatPipe,
    ErrorAlertComponent,
    LoadingSpinnerComponent,
    PolicyFilterComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './policy-list.component.html',
  styleUrl: './policy-list.component.scss',
})
export class PolicyListComponent {
  protected readonly store = inject(PolicyStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly pageSizeOptions = PAGE_SIZE_OPTIONS;
  protected readonly columns = [
    'select',
    'policyNumber',
    'policyholderName',
    'lineOfBusiness',
    'status',
    'premiumAmount',
    'region',
    'expiryDate',
    'flaggedForReview',
    'actions',
  ];

  protected readonly busy = computed(() => this.store.loading() || this.store.flagging());
  protected readonly isEmpty = computed(
    () => !this.store.loading() && !this.store.error() && this.store.policies().length === 0,
  );
  protected readonly filtered = computed(() => hasCriteria(this.store.criteria()));

  protected readonly sortActive = computed(() => this.store.sort()?.split(',')[0] ?? '');
  protected readonly sortDirection = computed(() => (this.store.sort()?.split(',')[1] ?? '') as SortDirection);

  private readonly selected = computed(() => new Set(this.store.selectedIds()));
  /** Already-flagged rows can't be selected — flagging them again is a no-op. */
  private readonly selectable = computed(() => this.store.policies().filter((p) => !p.flaggedForReview));
  protected readonly allSelected = computed(
    () => this.selectable().length > 0 && this.selectable().every((p) => this.selected().has(p.id)),
  );
  protected readonly someSelected = computed(() => this.selected().size > 0 && !this.allSelected());

  constructor() {
    // URL → store. Invalid params are dropped by the parser; rewrite the URL so it matches what's shown.
    this.route.queryParamMap.pipe(takeUntilDestroyed(inject(DestroyRef))).subscribe((params) => {
      const query = queryFromParams(params);
      this.store.setQuery(query);
      const canonical = paramsFromQuery(query);
      if (!sameParams(canonical, this.route.snapshot.queryParams)) {
        this.navigate(query, true);
      }
    });
  }

  protected isSelected(policy: Policy): boolean {
    return this.selected().has(policy.id);
  }

  protected toggleAll(): void {
    this.store.setSelected(this.allSelected() ? [] : this.selectable().map((p) => p.id));
  }

  protected onCriteriaChange(criteria: PolicyCriteria): void {
    this.navigate({ ...this.store.query(), ...criteria, page: 0 });
  }

  protected onSort(sort: Sort): void {
    const value = sort.direction ? `${sort.active},${sort.direction}` : null;
    this.navigate({ ...this.store.query(), sort: value, page: 0 });
  }

  protected onPage(event: PageEvent): void {
    // Changing the page size invalidates the old page index, so go back to the first page.
    const page = event.pageSize === this.store.size() ? event.pageIndex : 0;
    this.navigate({ ...this.store.query(), page, size: event.pageSize });
  }

  protected clearFilters(): void {
    this.navigate({ page: 0, size: this.store.size(), sort: this.store.sort() });
  }

  protected flagSelected(): Promise<void> {
    return this.flag(this.store.selectedIds());
  }

  protected flagOne(policy: Policy): Promise<void> {
    return this.flag([policy.id]);
  }

  private async flag(ids: string[]): Promise<void> {
    const res = await this.store.flag(ids);
    if (!res) return; // failure already surfaced by the error interceptor
    const outcomes = Object.values(res.results);
    const updated = outcomes.filter((r) => r === 'updated').length;
    const missing = outcomes.length - updated;
    const msg =
      `Flagged ${updated} ${updated === 1 ? 'policy' : 'policies'} for review` +
      (missing ? ` · ${missing} not found` : '');
    this.snackBar.open(msg, 'OK', { duration: 4000 });
  }

  private navigate(query: PolicyFilter, replaceUrl = false): void {
    void this.router.navigate([], { relativeTo: this.route, queryParams: paramsFromQuery(query), replaceUrl });
  }
}

function sameParams(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  return [...keys].every((k) => String(a[k] ?? '') === String(b[k] ?? ''));
}
