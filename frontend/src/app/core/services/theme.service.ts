import { DOCUMENT } from '@angular/common';
import { Injectable, effect, inject, signal } from '@angular/core';

export type Theme = 'light' | 'dark';

/** localStorage key. Also read by the pre-boot script in index.html — keep them in sync. */
export const THEME_STORAGE_KEY = 'pms-theme';

/**
 * Light/dark theme. On first load uses the stored choice, else `prefers-color-scheme`.
 * Until the user picks a theme explicitly, OS changes are followed live.
 *
 * Applies the theme by setting `color-scheme` on <html>; the design tokens in styles.scss are
 * `light-dark()` pairs, so this one property switches every token (and the Material theme on top).
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly media = this.document.defaultView?.matchMedia?.('(prefers-color-scheme: dark)');

  readonly theme = signal<Theme>(this.readStored() ?? this.systemTheme());

  constructor() {
    this.media?.addEventListener('change', (e) => {
      if (!this.readStored()) this.theme.set(e.matches ? 'dark' : 'light');
    });

    effect(() => {
      const theme = this.theme();
      const root = this.document.documentElement;
      root.style.colorScheme = theme;
      root.classList.toggle('dark-theme', theme === 'dark');
    });
  }

  toggle(): void {
    this.set(this.theme() === 'dark' ? 'light' : 'dark');
  }

  set(theme: Theme): void {
    this.theme.set(theme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Storage unavailable (private mode / disabled) — theme still applies for this session.
    }
  }

  private readStored(): Theme | null {
    try {
      const value = localStorage.getItem(THEME_STORAGE_KEY);
      return value === 'light' || value === 'dark' ? value : null;
    } catch {
      return null;
    }
  }

  private systemTheme(): Theme {
    return this.media?.matches ? 'dark' : 'light';
  }
}
