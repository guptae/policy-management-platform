import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subject, catchError, of, switchMap, tap } from 'rxjs';
import { describeHttpError } from '../../../core/interceptors/error.interceptor';
import { LINES_OF_BUSINESS, PolicySummary } from '../../../core/models/policy.models';
import { ApiService } from '../../../core/services/api.service';
import { ErrorAlertComponent } from '../../../shared/components/error-alert/error-alert.component';
import { CurrencyFormatPipe } from '../../../shared/pipes/currency-format.pipe';

type Tone = 'active' | 'expired' | 'pending' | 'expiring';

interface Tile {
  tone: Tone;
  icon: string;
  label: string;
  hint: string;
  value: number;
}

/**
 * Portfolio-wide stat tiles and premium-by-line-of-business breakdown. Loads GET /policies/summary
 * itself — deliberately independent of the table filters — and can be refreshed on demand.
 */
@Component({
  selector: 'app-policy-summary',
  imports: [DatePipe, DecimalPipe, MatButtonModule, MatIconModule, MatTooltipModule, CurrencyFormatPipe, ErrorAlertComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './policy-summary.component.html',
  styleUrl: './policy-summary.component.scss',
})
export class PolicySummaryComponent {
  private readonly api = inject(ApiService);
  private readonly refresh$ = new Subject<void>();

  protected readonly summary = signal<PolicySummary | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<{ title: string; message: string } | null>(null);
  protected readonly updatedAt = signal<Date | null>(null);

  /** Placeholder rows for the skeleton. */
  protected readonly skeletonTiles = [0, 1, 2, 3];
  protected readonly skeletonRows = [0, 1, 2, 3];

  protected readonly tiles = computed<Tile[]>(() => {
    const s = this.summary();
    if (!s) return [];
    const by = s.countByStatus;
    return [
      { tone: 'active', icon: 'verified', label: 'Active policies', hint: 'In force today', value: by['Active'] ?? 0 },
      { tone: 'expired', icon: 'event_busy', label: 'Expired policies', hint: 'Past expiry date', value: by['Expired'] ?? 0 },
      { tone: 'pending', icon: 'pending', label: 'Pending policies', hint: 'Awaiting activation', value: by['Pending'] ?? 0 },
      {
        tone: 'expiring',
        icon: 'schedule',
        label: 'Expiring soon',
        hint: 'Within the next 30 days',
        value: s.expiringSoonCount,
      },
    ];
  });

  /** Union of currencies across all lines, alphabetical, so each becomes a column. */
  protected readonly currencies = computed(() => {
    const s = this.summary();
    if (!s) return [];
    const set = new Set<string>();
    for (const perCurrency of Object.values(s.totalPremiumByLineOfBusiness)) {
      Object.keys(perCurrency).forEach((c) => set.add(c));
    }
    return [...set].sort();
  });

  /** Lines in canonical order, then any the API adds that the UI doesn't know yet. */
  protected readonly premiumRows = computed(() => {
    const s = this.summary();
    if (!s) return [];
    const data = s.totalPremiumByLineOfBusiness;
    const known: string[] = LINES_OF_BUSINESS.filter((lob) => lob in data);
    const extra = Object.keys(data).filter((lob) => !known.includes(lob));
    return [...known, ...extra].map((lob) => ({ lob, byCurrency: data[lob] }));
  });

  constructor() {
    this.refresh$
      .pipe(
        tap(() => {
          this.loading.set(true);
          this.error.set(null);
        }),
        // switchMap: a second refresh click cancels the in-flight request.
        switchMap(() =>
          this.api.getSummary({ handleErrorsLocally: true }).pipe(
            tap((summary) => {
              this.summary.set(summary);
              this.updatedAt.set(new Date());
            }),
            catchError((err: unknown) => {
              // Keep showing the last good figures; the banner says they couldn't be refreshed.
              this.error.set(describeHttpError(err));
              return of(null);
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.loading.set(false));

    this.refresh();
  }

  refresh(): void {
    this.refresh$.next();
  }
}
