import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

/** Error banner, optionally dismissible and/or with a retry action. */
@Component({
  selector: 'app-error-alert',
  imports: [MatButtonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="alert" role="alert">
      <mat-icon class="icon" aria-hidden="true">error</mat-icon>
      <div class="text">
        @if (title()) {
          <strong>{{ title() }}</strong>
        }
        <span>{{ message() }}</span>
      </div>
      @if (retryable()) {
        <button mat-button type="button" class="retry" (click)="retry.emit()">
          <mat-icon aria-hidden="true">refresh</mat-icon>
          Retry
        </button>
      }
      @if (dismissible()) {
        <button mat-icon-button type="button" aria-label="Dismiss error" (click)="dismissed.emit()">
          <mat-icon aria-hidden="true">close</mat-icon>
        </button>
      }
    </div>
  `,
  styles: `
    .alert {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 0.75rem 0.5rem 0.75rem 1rem;
      border-radius: var(--mat-sys-corner-medium);
      background: var(--mat-sys-error-container);
      color: var(--mat-sys-on-error-container);
    }
    .icon {
      margin-top: 0.5rem;
      flex: none;
    }
    .text {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
      padding-top: 0.5rem;
      font: var(--mat-sys-body-medium);
    }
    button {
      color: inherit;
    }
    .retry {
      margin-top: 0.25rem;
    }
  `,
})
export class ErrorAlertComponent {
  readonly title = input<string>('');
  readonly message = input.required<string>();
  readonly dismissible = input(true);
  readonly retryable = input(false);
  readonly dismissed = output<void>();
  readonly retry = output<void>();
}
