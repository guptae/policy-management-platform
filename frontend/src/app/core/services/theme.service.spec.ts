import { TestBed } from '@angular/core/testing';
import { THEME_STORAGE_KEY, ThemeService } from './theme.service';

/** Controllable stand-in for window.matchMedia('(prefers-color-scheme: dark)'). */
function mockPrefersColorScheme(initiallyDark: boolean) {
  const listeners: ((e: { matches: boolean }) => void)[] = [];
  const mql = {
    matches: initiallyDark,
    media: '(prefers-color-scheme: dark)',
    addEventListener: (_: string, fn: (e: { matches: boolean }) => void) => listeners.push(fn),
    removeEventListener: () => undefined,
  };
  const matchMedia = vi.fn((query: string) => ({ ...mql, media: query, matches: query.includes('dark') && mql.matches }));
  window.matchMedia = matchMedia as unknown as typeof window.matchMedia;
  return {
    matchMedia,
    /** Simulates the user changing their OS appearance. */
    change(dark: boolean) {
      mql.matches = dark;
      listeners.forEach((fn) => fn({ matches: dark }));
    },
  };
}

describe('ThemeService', () => {
  const originalMatchMedia = window.matchMedia;
  const root = document.documentElement;

  const create = () => {
    const service = TestBed.inject(ThemeService);
    TestBed.tick(); // flush the effect that applies the theme to <html>
    return service;
  };

  beforeEach(() => localStorage.clear());

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    root.style.colorScheme = '';
    root.classList.remove('dark-theme');
    vi.restoreAllMocks();
  });

  describe('first load (no stored choice)', () => {
    it('reads prefers-color-scheme: dark', () => {
      const media = mockPrefersColorScheme(true);
      const theme = create();

      expect(media.matchMedia).toHaveBeenCalledWith('(prefers-color-scheme: dark)');
      expect(theme.theme()).toBe('dark');
      expect(root.style.colorScheme).toBe('dark');
      expect(root.classList.contains('dark-theme')).toBe(true);
    });

    it('reads prefers-color-scheme: light', () => {
      mockPrefersColorScheme(false);
      const theme = create();

      expect(theme.theme()).toBe('light');
      expect(root.style.colorScheme).toBe('light');
      expect(root.classList.contains('dark-theme')).toBe(false);
    });

    it('does not persist the OS-derived theme', () => {
      mockPrefersColorScheme(true);
      create();
      expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
    });

    it('follows OS changes until the user chooses', () => {
      const media = mockPrefersColorScheme(false);
      const theme = create();

      media.change(true);
      expect(theme.theme()).toBe('dark');

      theme.set('light'); // explicit choice
      media.change(true);
      expect(theme.theme()).toBe('light');
    });

    it('falls back to light when matchMedia is unavailable', () => {
      window.matchMedia = undefined as unknown as typeof window.matchMedia;
      expect(create().theme()).toBe('light');
    });
  });

  describe('persistence', () => {
    it('uses the "pms-theme" key', () => {
      expect(THEME_STORAGE_KEY).toBe('pms-theme');
    });

    it('stored choice wins over prefers-color-scheme', () => {
      mockPrefersColorScheme(true);
      localStorage.setItem('pms-theme', 'light');
      expect(create().theme()).toBe('light');
    });

    it('ignores an invalid stored value', () => {
      mockPrefersColorScheme(true);
      localStorage.setItem('pms-theme', 'purple');
      expect(create().theme()).toBe('dark');
    });

    it('toggle() persists to localStorage and applies the scheme', () => {
      mockPrefersColorScheme(false);
      const theme = create();

      theme.toggle();
      TestBed.tick();
      expect(localStorage.getItem('pms-theme')).toBe('dark');
      expect(root.style.colorScheme).toBe('dark');

      theme.toggle();
      TestBed.tick();
      expect(localStorage.getItem('pms-theme')).toBe('light');
      expect(root.style.colorScheme).toBe('light');
    });

    it('set() persists the explicit value', () => {
      mockPrefersColorScheme(false);
      create().set('dark');
      expect(localStorage.getItem('pms-theme')).toBe('dark');
    });

    it('still switches theme when localStorage throws (e.g. disabled storage)', () => {
      mockPrefersColorScheme(false);
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('SecurityError');
      });
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      const theme = create();
      expect(() => theme.toggle()).not.toThrow();
      TestBed.tick();
      expect(theme.theme()).toBe('dark');
      expect(root.style.colorScheme).toBe('dark');
    });
  });
});
