/**
 * useInstallation Hook
 * Provides easy access to installation configuration and theme.
 * Wraps the installationStore for simpler component usage.
 */

import { useEffect } from 'react';
import { useInstallationStore } from '@/stores/installationStore';
import { resolveStaticUrl } from '@/lib/api';

/**
 * Hook to access installation configuration.
 * Returns config values with sensible defaults while loading.
 */
export function useInstallation() {
  const config = useInstallationStore((state) => state.config);
  const configLoading = useInstallationStore((state) => state.configLoading);
  const configError = useInstallationStore((state) => state.configError);
  const fetchConfig = useInstallationStore((state) => state.fetchConfig);
  const canAccessPage = useInstallationStore((state) => state.canAccessPage);
  const getEnabledSensors = useInstallationStore((state) => state.getEnabledSensors);
  const getTheme = useInstallationStore((state) => state.getTheme);

  // Extract pages_config safely (backend returns it as Dict)
  const pagesConfig = config?.pages_config as { enabled?: string[]; default?: string } | undefined;

  return {
    config,
    isLoading: configLoading,
    error: configError,
    fetchConfig,
    canAccessPage,
    getEnabledSensors,
    getTheme,

    // Computed values for convenience
    installationName: config?.installation_name ?? 'AtlaXia',
    logoUrl: resolveStaticUrl(config?.logo_url ?? null),
    theme: getTheme(),
    // If no config yet, return empty array (show all pages until config loads)
    enabledPages: pagesConfig?.enabled ?? [],
    defaultPage: pagesConfig?.default ?? 'overview',
    sensorsConfig: config?.sensors_config ?? null,
  };
}

/**
 * Hook to load installation config when authenticated.
 * Call this once at the app level.
 */
export function useInstallationLoader(isAuthenticated: boolean) {
  const fetchConfig = useInstallationStore((state) => state.fetchConfig);
  const config = useInstallationStore((state) => state.config);

  useEffect(() => {
    if (isAuthenticated && !config) {
      fetchConfig();
    }
  }, [isAuthenticated, config, fetchConfig]);
}

/**
 * Hook to get theme colors for CSS variables.
 */
export function useTheme() {
  const getTheme = useInstallationStore((state) => state.getTheme);
  return getTheme();
}
