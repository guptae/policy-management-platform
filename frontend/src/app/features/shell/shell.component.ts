import { ChangeDetectionStrategy, Component, ElementRef, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AlertService } from '../../core/services/alert.service';
import { ThemeService } from '../../core/services/theme.service';
import { ErrorAlertComponent } from '../../shared/components/error-alert/error-alert.component';

/** App shell: skip link, top nav, theme toggle, global error alerts and the routed content. */
@Component({
  selector: 'app-shell',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatButtonModule,
    MatIconModule,
    MatToolbarModule,
    MatTooltipModule,
    ErrorAlertComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
})
export class ShellComponent {
  protected readonly theme = inject(ThemeService);
  protected readonly alerts = inject(AlertService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly isDark = computed(() => this.theme.theme() === 'dark');
  /** Describes the action, so the label is accurate for screen readers in either state. */
  protected readonly toggleLabel = computed(() => (this.isDark() ? 'Switch to light theme' : 'Switch to dark theme'));

  /** Hash links don't work with <base href> + the router, so move focus to <main> directly. */
  protected skipToMain(event: Event): void {
    event.preventDefault();
    this.host.nativeElement.querySelector<HTMLElement>('#main-content')?.focus();
  }
}
