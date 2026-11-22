import { ChangeDetectionStrategy, Component, effect, inject, input, untracked } from '@angular/core';
import { outputFromObservable } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { debounceTime, filter, map } from 'rxjs';
import {
  LINES_OF_BUSINESS,
  LineOfBusiness,
  POLICY_STATUSES,
  PolicyStatus,
  REGIONS,
} from '../../../core/models/policy.models';
import { PolicyCriteria, hasCriteria, normalizeCriteria, sameCriteria } from '../policy-query-params';

/**
 * Reactive filter form. `criteria` (from the URL) is pushed into the form; user edits are emitted via
 * `criteriaChange` (search text debounced). The parent owns the URL, so this component stays stateless.
 */
@Component({
  selector: 'app-policy-filter',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
  ],
  providers: [provideNativeDateAdapter()],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './policy-filter.component.html',
  styleUrl: './policy-filter.component.scss',
})
export class PolicyFilterComponent {
  /** Current criteria (source of truth: URL). */
  readonly criteria = input<PolicyCriteria>({});
  /** Disables the controls while a request is in flight. Search stays editable so typing keeps focus. */
  readonly disabled = input(false);

  protected readonly statuses = POLICY_STATUSES;
  protected readonly linesOfBusiness = LINES_OF_BUSINESS;
  protected readonly regions = REGIONS;
  protected readonly hasCriteria = hasCriteria;

  protected readonly form = inject(FormBuilder).group({
    search: [''],
    status: [null as PolicyStatus | null],
    lineOfBusiness: [null as LineOfBusiness | null],
    region: [null as string | null],
    effectiveDateFrom: [null as Date | null],
    effectiveDateTo: [null as Date | null],
  });

  readonly criteriaChange = outputFromObservable(
    this.form.valueChanges.pipe(
      debounceTime(300),
      map(() => this.toCriteria()),
      // Compare against the current input, not the last emission: the URL may have changed
      // underneath us (back/forward), and the user re-selecting the old value must still emit.
      filter((c) => !sameCriteria(c, this.criteria())),
    ),
  );

  constructor() {
    // URL → form. emitEvent:false so syncing from the URL doesn't echo back as a user change.
    effect(() => {
      const c = normalizeCriteria(this.criteria());
      untracked(() => {
        if (sameCriteria(c, this.toCriteria())) return;
        this.form.patchValue(
          {
            search: c.search ?? '',
            status: c.status,
            lineOfBusiness: c.lineOfBusiness,
            region: c.region,
            effectiveDateFrom: fromIsoDate(c.effectiveDateFrom),
            effectiveDateTo: fromIsoDate(c.effectiveDateTo),
          },
          { emitEvent: false },
        );
      });
    });

    effect(() => {
      const disabled = this.disabled();
      const { search, ...others } = this.form.controls;
      for (const control of Object.values(others)) {
        if (disabled) control.disable({ emitEvent: false });
        else control.enable({ emitEvent: false });
      }
    });
  }

  protected reset(): void {
    this.form.reset({ search: '' });
  }

  private toCriteria(): PolicyCriteria {
    const v = this.form.getRawValue();
    return normalizeCriteria({
      search: v.search,
      status: v.status,
      lineOfBusiness: v.lineOfBusiness,
      region: v.region,
      effectiveDateFrom: toIsoDate(v.effectiveDateFrom),
      effectiveDateTo: toIsoDate(v.effectiveDateTo),
    });
  }
}

/** yyyy-MM-dd in local time (toISOString would shift the day for timezones ahead of UTC). */
function toIsoDate(date: Date | null): string | null {
  if (!date || Number.isNaN(date.getTime())) return null;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function fromIsoDate(iso: string | null): Date | null {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}
