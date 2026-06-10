// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.hoisted(() => {
  let store: Record<string, string> = {};
  const memoryStorage = {
    getItem: (k: string) => (k in store ? store[k] : null),
    setItem: (k: string, v: string) => {
      store[k] = v;
    },
    removeItem: (k: string) => {
      delete store[k];
    },
    clear: () => {
      store = {};
    },
    key: (i: number) => Object.keys(store)[i] ?? null,
    get length() {
      return Object.keys(store).length;
    },
  } as Storage;
  vi.stubGlobal('localStorage', memoryStorage);
});

import { render } from '@testing-library/react';

let installationConfig: { theme_variant?: string | null; theme_primary: string; theme_secondary: string; theme_accent: string; logo_url: string | null; installation_name: string } | null = null;
let userThemeVariant: string | null = null;

vi.mock('@/stores/installationStore', () => ({
  useInstallationStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = { config: installationConfig };
    return selector(state);
  },
}));

vi.mock('@/stores/authStore', () => ({
  useAuthStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      session: userThemeVariant !== null ? { theme_variant: userThemeVariant } : null,
    };
    return selector(state);
  },
}));

import { ThemeProvider } from './ThemeProvider';

function buildConfig(variant: 'scada' | 'modern' | null) {
  return {
    theme_variant: variant ?? undefined,
    theme_primary: '#0D9488',
    theme_secondary: '#0EA5E9',
    theme_accent: '#F59E0B',
    logo_url: null,
    installation_name: 'Test Plant',
  };
}

describe('ThemeProvider variant precedence', () => {
  beforeEach(() => {
    installationConfig = null;
    userThemeVariant = null;
    document.documentElement.className = '';
  });

  it('falls back to scada when neither user nor installation set a variant', () => {
    render(<ThemeProvider><div /></ThemeProvider>);
    expect(document.documentElement.classList.contains('theme-scada')).toBe(true);
    expect(document.documentElement.classList.contains('theme-modern')).toBe(false);
  });

  it('uses installation variant when user has none', () => {
    installationConfig = buildConfig('modern');
    render(<ThemeProvider><div /></ThemeProvider>);
    expect(document.documentElement.classList.contains('theme-modern')).toBe(true);
    expect(document.documentElement.classList.contains('theme-scada')).toBe(false);
  });

  it('user variant overrides installation variant', () => {
    installationConfig = buildConfig('scada');
    userThemeVariant = 'modern';
    render(<ThemeProvider><div /></ThemeProvider>);
    expect(document.documentElement.classList.contains('theme-modern')).toBe(true);
    expect(document.documentElement.classList.contains('theme-scada')).toBe(false);
  });

  it('user variant of scada overrides installation modern', () => {
    installationConfig = buildConfig('modern');
    userThemeVariant = 'scada';
    render(<ThemeProvider><div /></ThemeProvider>);
    expect(document.documentElement.classList.contains('theme-scada')).toBe(true);
    expect(document.documentElement.classList.contains('theme-modern')).toBe(false);
  });
});
