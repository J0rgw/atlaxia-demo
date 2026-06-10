import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useInstallationStore } from '@/stores/installationStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import { resolveStaticUrl } from '@/lib/api';
import {
  useUnauthThemeBootstrap,
  readStoredThemeMode,
} from '@/hooks/useUnauthThemeBootstrap';

const IS_DEMO = import.meta.env.MODE === 'demo';
const TOUR_WIZARD_FLAG = 'demo.tourWizard';

export function LoginPage() {
  const [username, setUsername] = useState(IS_DEMO ? 'demo' : '');
  const [password, setPassword] = useState(IS_DEMO ? 'demo' : '');
  const [showPassword, setShowPassword] = useState(false);

  const login = useAuthStore((state) => state.login);
  const isLoading = useAuthStore((state) => state.isLoading);
  const error = useAuthStore((state) => state.error);
  const clearError = useAuthStore((state) => state.clearError);

  const status = useInstallationStore((s) => s.status);
  const statusLoading = useInstallationStore((s) => s.statusLoading);
  const fetchStatus = useInstallationStore((s) => s.fetchStatus);
  const branding = useInstallationStore((s) => s.branding);
  const fetchBranding = useInstallationStore((s) => s.fetchBranding);

  // Pull the customer's branding before the page paints so login uses the
  // real palette / logo instead of the design-system defaults.
  useEffect(() => {
    if (!branding) {
      fetchBranding().catch(() => {
        // Endpoint failure is non-fatal — fall back to defaults.
      });
    }
  }, [branding, fetchBranding]);

  const palette = useMemo(
    () => ({
      primary: branding?.theme_primary ?? '#0D9488',
      secondary: branding?.theme_secondary ?? '#0EA5E9',
      accent: branding?.theme_accent ?? '#F59E0B',
    }),
    [branding?.theme_primary, branding?.theme_secondary, branding?.theme_accent],
  );
  const variant = branding?.theme_variant ?? 'scada';

  useUnauthThemeBootstrap(variant, readStoredThemeMode(), palette);

  const installationName = branding?.installation_name ?? 'AtlaXia';
  const logoUrl = branding?.logo_url ? resolveStaticUrl(branding.logo_url) ?? branding.logo_url : null;

  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

  // Check installation status on mount
  useEffect(() => {
    fetchStatus().catch(() => {
      // If status check fails, allow login attempt
    });
  }, [fetchStatus]);

  // Redirect to setup if not completed
  useEffect(() => {
    if (status && !status.setup_completed) {
      navigate('/setup', { replace: true });
    }
  }, [status, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    try {
      await login(username, password);
      navigate(from, { replace: true });
    } catch {
      // Error is handled in the store
    }
  };

  const handleDemoSignIn = async () => {
    clearError();
    try {
      localStorage.removeItem(TOUR_WIZARD_FLAG);
      await login('demo', 'demo');
      navigate(from, { replace: true });
    } catch {
      // Error is handled in the store
    }
  };

  const handleTourWizard = () => {
    localStorage.setItem(TOUR_WIZARD_FLAG, 'true');
    navigate('/setup');
  };

  // Show loading while checking status
  if (statusLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-base)]">
        <div className="flex items-center gap-3">
          <svg className="animate-spin h-6 w-6 text-[var(--accent-primary)]" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-[var(--text-secondary)]">Verificando instalacion...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-base)]">
      <div className="w-full max-w-md px-4">
        <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-md p-4">
          <div className="flex justify-center mb-8">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 bg-[var(--accent-primary)] rounded-md flex items-center justify-center overflow-hidden shrink-0">
                {logoUrl ? (
                  <img src={logoUrl} alt={installationName} className="w-full h-full object-contain" />
                ) : (
                  <span className="text-white font-bold text-lg">
                    {installationName.slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
              <span className="text-2xl font-bold text-[var(--accent-primary)] truncate">
                {installationName}
              </span>
            </div>
          </div>

          <div className="text-center mb-8">
            <h1 className="text-xl font-semibold text-[var(--text-primary)]">Bienvenido</h1>
            <p className="text-[var(--text-secondary)] text-sm mt-1">Ingresa tus credenciales para continuar</p>
          </div>

          {IS_DEMO && (
            <div className="mb-6 space-y-3">
              <Button
                type="button"
                onClick={handleDemoSignIn}
                disabled={isLoading}
                className="w-full h-11 bg-[var(--accent-primary)] hover:opacity-90 text-white font-medium rounded-md transition-all"
              >
                Sign in as demo admin
              </Button>
              <button
                type="button"
                onClick={handleTourWizard}
                className="w-full text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] underline underline-offset-2"
              >
                Tour the setup wizard
              </button>
              <div className="flex items-center gap-3 text-xs text-[var(--text-muted)] uppercase tracking-wide">
                <span className="flex-1 h-px bg-[var(--border-subtle)]" />
                <span>or sign in manually</span>
                <span className="flex-1 h-px bg-[var(--border-subtle)]" />
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                Usuario
              </label>
              <Input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ingrese su usuario"
                className="w-full"
                required
                autoComplete="username"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
                Contrasena
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ingrese su contrasena"
                  className="w-full pr-10"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-[var(--status-critical-muted)] border border-[var(--status-critical)]/40 rounded-md text-[var(--status-critical)] text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-11 bg-[var(--accent-primary)] hover:opacity-90 text-white font-medium rounded-md transition-all"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Ingresando...
                </span>
              ) : (
                'Ingresar'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-xs text-[var(--text-muted)]">
            Sistema de monitoreo industrial
          </div>
        </div>
      </div>
    </div>
  );
}
