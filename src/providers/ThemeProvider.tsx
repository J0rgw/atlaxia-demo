/**
 * ThemeProvider
 * - dark/light mode (per-browser, localStorage 'theme-mode')
 * - theme variant: 'scada' | 'modern' (per-installation, from config.theme_variant)
 * - per-installation branding colours (--color-primary*) injected from config.theme_primary
 *
 * Token VALUES live in src/styles/themes/{scada,modern}.css and respond to the
 * `.theme-scada` / `.theme-modern` + `.dark` classes on <html>. This component
 * only toggles classes and injects branding colours.
 */

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useInstallationStore } from '@/stores/installationStore';
import { useAuthStore } from '@/stores/authStore';
import { resolveStaticUrl } from '@/lib/api';

export type ThemeMode = 'light' | 'dark';
export type ThemeVariant = 'scada' | 'modern';

interface ThemeContextValue {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
  variant: ThemeVariant;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

interface ThemeProviderProps {
  children: ReactNode;
}

function hexToLighter(hex: string, amount: number = 0.9): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.floor((num >> 16) + (255 - (num >> 16)) * amount));
  const g = Math.min(255, Math.floor(((num >> 8) & 0x00FF) + (255 - ((num >> 8) & 0x00FF)) * amount));
  const b = Math.min(255, Math.floor((num & 0x0000FF) + (255 - (num & 0x0000FF)) * amount));
  return `#${(1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1).toUpperCase()}`;
}

function hexToDarker(hex: string, amount: number = 0.2): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, Math.floor((num >> 16) * (1 - amount)));
  const g = Math.max(0, Math.floor(((num >> 8) & 0x00FF) * (1 - amount)));
  const b = Math.max(0, Math.floor((num & 0x0000FF) * (1 - amount)));
  return `#${(1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1).toUpperCase()}`;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const config = useInstallationStore((state) => state.config);
  const userTheme = useAuthStore((state) => state.session?.theme_variant ?? null);

  const [mode, setModeState] = useState<ThemeMode>(() => {
    const stored = localStorage.getItem('theme-mode');
    return (stored === 'dark' || stored === 'light') ? stored : 'dark';
  });

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    localStorage.setItem('theme-mode', newMode);
  };

  const toggleMode = () => {
    setMode(mode === 'light' ? 'dark' : 'light');
  };

  const resolvedVariant = userTheme ?? config?.theme_variant ?? 'scada';
  const variant: ThemeVariant = resolvedVariant === 'modern' ? 'modern' : 'scada';

  useEffect(() => {
    const root = document.documentElement;

    root.classList.toggle('dark', mode === 'dark');
    root.classList.toggle('theme-scada', variant === 'scada');
    root.classList.toggle('theme-modern', variant === 'modern');
  }, [mode, variant]);

  // Per-installation branding colours (independent of theme template)
  useEffect(() => {
    if (!config) return;

    const root = document.documentElement;

    root.style.setProperty('--color-primary', config.theme_primary);
    root.style.setProperty('--color-primary-hover', hexToDarker(config.theme_primary, 0.15));
    root.style.setProperty('--color-primary-light', hexToLighter(config.theme_primary, 0.85));
    root.style.setProperty('--color-primary-lighter', hexToLighter(config.theme_primary, 0.95));
    root.style.setProperty('--color-primary-dark', hexToDarker(config.theme_primary, 0.3));
    root.style.setProperty('--color-primary-400', hexToLighter(config.theme_primary, 0.3));

    root.style.setProperty('--color-secondary', config.theme_secondary);
    root.style.setProperty('--color-secondary-light', hexToLighter(config.theme_secondary, 0.85));
    root.style.setProperty('--color-secondary-dark', hexToDarker(config.theme_secondary, 0.3));

    root.style.setProperty('--color-warning', config.theme_accent);
    root.style.setProperty('--color-warning-light', hexToLighter(config.theme_accent, 0.85));
  }, [config]);

  useEffect(() => {
    if (!config?.logo_url) return;

    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = resolveStaticUrl(config.logo_url) || config.logo_url;
  }, [config?.logo_url]);

  useEffect(() => {
    if (config?.installation_name) {
      document.title = config.installation_name;
    }
  }, [config?.installation_name]);

  return (
    <ThemeContext.Provider value={{ mode, setMode, toggleMode, variant }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export default ThemeProvider;
