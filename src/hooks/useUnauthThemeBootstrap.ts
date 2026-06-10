/**
 * useUnauthThemeBootstrap
 *
 * Drives the same `<html>` classes (`theme-scada` / `theme-modern` / `dark`)
 * and branding CSS variables that ThemeProvider sets for authenticated
 * sessions, but using whatever palette is passed in. Pre-auth screens
 * (LoginPage, SetupWizard) use this so they look branded before any user
 * has logged in.
 *
 * Inputs:
 *   - variant: theme template (scada / modern). Drives the .theme-* class.
 *   - mode: 'light' | 'dark'. Drives the .dark class. Persisted to
 *     localStorage('theme-mode') so the choice survives navigation.
 *   - palette: { primary, secondary, accent } hex triple to inject into the
 *     branding CSS variables (--color-primary*, --accent-primary, etc.).
 *
 * Cleanup is intentionally a no-op: when the next screen mounts (login →
 * setup, setup → login, login → app) the new ThemeProvider/bootstrap will
 * overwrite these values, avoiding a flash to defaults between routes.
 */

import { useEffect } from 'react';
import type { ThemeTemplate } from '@/types/installation';

export type PreviewMode = 'light' | 'dark';

interface Palette {
  primary: string;
  secondary: string;
  accent: string;
}

function hexToLighter(hex: string, amount: number = 0.9): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.floor((num >> 16) + (255 - (num >> 16)) * amount));
  const g = Math.min(255, Math.floor(((num >> 8) & 0x00ff) + (255 - ((num >> 8) & 0x00ff)) * amount));
  const b = Math.min(255, Math.floor((num & 0x0000ff) + (255 - (num & 0x0000ff)) * amount));
  return `#${(1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1).toUpperCase()}`;
}

function hexToDarker(hex: string, amount: number = 0.2): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, Math.floor((num >> 16) * (1 - amount)));
  const g = Math.max(0, Math.floor(((num >> 8) & 0x00ff) * (1 - amount)));
  const b = Math.max(0, Math.floor((num & 0x0000ff) * (1 - amount)));
  return `#${(1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1).toUpperCase()}`;
}

export function useUnauthThemeBootstrap(
  variant: ThemeTemplate,
  mode: PreviewMode,
  palette: Palette,
): void {
  // Destructure once so the branding effect can key on primitive deps. If we
  // depended on the `palette` object itself, a caller that rebuilds the
  // literal in render scope (LoginPage before B13) would refire all 12
  // setProperty writes every render.
  const { primary, secondary, accent } = palette;

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('theme-scada', variant === 'scada');
    root.classList.toggle('theme-modern', variant === 'modern');
    root.classList.toggle('dark', mode === 'dark');
  }, [variant, mode]);

  useEffect(() => {
    try {
      localStorage.setItem('theme-mode', mode);
    } catch {
      // Storage may be disabled (private mode, stubbed env). Non-fatal.
    }
  }, [mode]);

  useEffect(() => {
    const root = document.documentElement;

    root.style.setProperty('--color-primary', primary);
    root.style.setProperty('--color-primary-hover', hexToDarker(primary, 0.15));
    root.style.setProperty('--color-primary-light', hexToLighter(primary, 0.85));
    root.style.setProperty('--color-primary-lighter', hexToLighter(primary, 0.95));
    root.style.setProperty('--color-primary-dark', hexToDarker(primary, 0.3));
    root.style.setProperty('--color-primary-400', hexToLighter(primary, 0.3));

    root.style.setProperty('--color-secondary', secondary);
    root.style.setProperty('--color-secondary-light', hexToLighter(secondary, 0.85));
    root.style.setProperty('--color-secondary-dark', hexToDarker(secondary, 0.3));

    root.style.setProperty('--color-warning', accent);
    root.style.setProperty('--color-warning-light', hexToLighter(accent, 0.85));

    // design.md §2.4 defines --accent-primary as "buttons, links, focus rings"
    // — drive it from the customer's primary so chrome reflects the brand.
    root.style.setProperty('--accent-primary', primary);
    root.style.setProperty('--accent-secondary', secondary);
  }, [primary, secondary, accent]);
}

export function readStoredThemeMode(): PreviewMode {
  try {
    const stored = localStorage.getItem('theme-mode');
    return stored === 'light' || stored === 'dark' ? stored : 'dark';
  } catch {
    return 'dark';
  }
}
