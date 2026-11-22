import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

/** Centred indeterminate spinner with an accessible label. */
@Component({
  selector: 'app-loading-spinner',
  imports: [MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="spinner" role="status" [attr.aria-label]="label()">
      <mat-progress-spinner mode="indeterminate" [diameter]="diameter()" />
      @if (showLabel()) {
        <span class="label">{{ label() }}</span>
      }
    </div>
  `,
  styles: `
    .spinner {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      padding: 1.5rem;
    }
    .label {
      font: var(--mat-sys-body-medium);
      color: var(--mat-sys-on-surface-variant);
    }
  `,
})
export class LoadingSpinnerComponent {
  readonly diameter = input(40);
  readonly label = input('Loading…');
  readonly showLabel = input(false);
}
