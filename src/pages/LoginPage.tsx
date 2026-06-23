import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useInstallationStore } from '@/stores/installationStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ArrowRight, Eye, EyeOff, AlertCircle } from 'lucide-react';
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

  useEffect(() => {
    if (!branding) {
      fetchBranding().catch(() => {});
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

  useEffect(() => {
    fetchStatus().catch(() => {});
  }, [fetchStatus]);

  // In a real installation setup is mandatory, so an incomplete install bounces
  // to the wizard. In the demo the wizard is opt-in (the "tour" button), so this
  // redirect must NOT run — otherwise the tour flag traps the user on /setup with
  // no way back to the demo login.
  useEffect(() => {
    if (!IS_DEMO && status && !status.setup_completed) {
      navigate('/setup', { replace: true });
    }
  }, [status, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    try {
      await login(username, password);
      navigate(from, { replace: true });
    } catch {}
  };

  const handleDemoSignIn = async () => {
    clearError();
    try {
      localStorage.removeItem(TOUR_WIZARD_FLAG);
      await login('demo', 'demo');
      navigate(from, { replace: true });
    } catch {}
  };

  const handleTourWizard = () => {
    localStorage.setItem(TOUR_WIZARD_FLAG, 'true');
    navigate('/setup');
  };

  if (statusLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-base)]">
        <div className="flex items-center gap-3">
          <svg className="animate-spin h-6 w-6 text-[var(--accent-primary)]" viewBox="0 0 24 24" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-[var(--text-secondary)]">Verificando instalacion...</span>
        </div>
      </div>
    );
  }

  if (IS_DEMO) {
    return (
      <DemoLoginSurface
        installationName={installationName}
        logoUrl={logoUrl}
        isLoading={isLoading}
        onDemoSignIn={handleDemoSignIn}
        onTourWizard={handleTourWizard}
      />
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

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Usuario</label>
              <Input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Ingrese su usuario" className="w-full" required autoComplete="username" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Contrasena</label>
              <div className="relative">
                <Input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Ingrese su contrasena" className="w-full pr-10" required autoComplete="current-password" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Ocultar contrasena' : 'Mostrar contrasena'}
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
            <Button type="submit" className="w-full h-11 bg-[var(--accent-primary)] hover:opacity-90 text-white font-medium rounded-md transition-all" disabled={isLoading}>
              {isLoading ? 'Ingresando...' : 'Ingresar'}
            </Button>
          </form>

          <div className="mt-6 text-center text-xs text-[var(--text-muted)]">Sistema de monitoreo industrial</div>
        </div>
      </div>
    </div>
  );
}

interface DemoLoginProps {
  installationName: string;
  logoUrl: string | null;
  isLoading: boolean;
  onDemoSignIn: () => void;
  onTourWizard: () => void;
}

// Demo-only login surface. Single editorial column on a dark stage. The
// primary CTA dominates; the wizard tour degrades visually so it reads as
// the secondary path.
function DemoLoginSurface(props: DemoLoginProps) {
  const { installationName, logoUrl, isLoading, onDemoSignIn, onTourWizard } = props;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[var(--bg-base)] text-[var(--text-primary)]">
      <SchematicBackdrop />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-8 lg:px-12 lg:py-10">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-sm bg-[var(--accent-primary)]/15 ring-1 ring-[var(--accent-primary)]/30">
              {logoUrl ? (
                <img src={logoUrl} alt="" className="h-full w-full object-contain p-1.5" />
              ) : (
                <span className="text-sm font-bold text-[var(--accent-primary)]">
                  {installationName.slice(0, 2).toUpperCase()}
                </span>
              )}
            </div>
            <span className="text-base font-semibold tracking-tight">{installationName}</span>
          </div>
        </header>

        <section className="flex flex-1 items-center">
          <div className="w-full max-w-2xl">
            <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-[var(--accent-primary)]">
              // demo pública poblado con datos mock de swat
            </p>

            <h1 className="mt-5 text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-[3.5rem]">
              Portal de operación
              <br />
              <span className="text-[var(--text-secondary)]">para plantas industriales.</span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-relaxed text-[var(--text-secondary)]">
              28 sensores, 6 procesos de tratamiento de agua, 6 ataques documentados.
              Datos reales reproducidos en bucle con deteccion ML en vivo.
            </p>

            <div className="mt-10 flex flex-col gap-4">
              <button
                type="button"
                onClick={onDemoSignIn}
                disabled={isLoading}
                className="group inline-flex h-14 w-full max-w-md items-center justify-between rounded-md bg-[var(--accent-primary)] px-5 text-base font-semibold text-white shadow-[0_8px_24px_-12px_var(--accent-primary)] transition-opacity hover:opacity-95 disabled:opacity-60"
              >
                <span>{isLoading ? 'Ingresando...' : 'Entrar como administrador demo'}</span>
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </button>

              <button
                type="button"
                onClick={onTourWizard}
                className="group inline-flex w-full max-w-md items-center justify-between font-mono text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
              >
                <span className="inline-flex items-center gap-2">
                  <span aria-hidden="true" className="text-[var(--accent-primary)]">o</span>
                  recorrer el asistente de configuracion
                </span>
                <ArrowRight className="h-4 w-4 opacity-60 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </section>

        <footer className="font-mono uppercase flex flex-col items-start justify-between gap-3 border-t border-[var(--border-subtle)] pt-6 text-xs sm:flex-row sm:items-center">
          <p className="text-[var(--text-muted)]">
            Monitoreo industrial para vigilancia de SCADA
          </p>
          <p className="text-[var(--text-muted)]">
            &copy; 2026 AtlaXia. Todos los derechos reservados.
          </p>
        </footer>
      </div>
    </main>
  );
}

// Watermark-style backdrop: a faint grid plus, at the bottom-right, several
// rows of SWAT sensor codes that drift leftward like a live telemetry ticker.
// Aria-hidden so it stays out of the accessibility tree, and the marquee is
// disabled under prefers-reduced-motion.
function SchematicBackdrop() {
  const rows = [
    ['LIT101', 'FIT101', 'AIT201', 'AIT202', 'AIT203', 'FIT201', 'LIT301'],
    ['FIT301', 'DPIT301', 'AIT301', 'AIT302', 'AIT303', 'LIT401', 'FIT401'],
    ['AIT401', 'AIT402', 'FIT501', 'FIT502', 'FIT503', 'FIT504', 'AIT501'],
    ['AIT502', 'AIT503', 'AIT504', 'PIT501', 'PIT502', 'PIT503', 'FIT601'],
  ];
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 select-none"
    >
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            'linear-gradient(var(--text-muted) 1px, transparent 1px), linear-gradient(90deg, var(--text-muted) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          maskImage: 'radial-gradient(ellipse at 80% 60%, black 0%, transparent 70%)',
          WebkitMaskImage: 'radial-gradient(ellipse at 80% 60%, black 0%, transparent 70%)',
        }}
      />
      <style>{`
        @keyframes atx-marquee-left {
          from { transform: translate3d(0, 0, 0); }
          to { transform: translate3d(-50%, 0, 0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .atx-marquee-row { animation: none !important; }
        }
      `}</style>
      <div
        className="absolute bottom-20 right-0 hidden w-[44rem] max-w-[62vw] flex-col gap-2 opacity-30 lg:flex"
        style={{
          maskImage:
            'linear-gradient(90deg, transparent 0%, black 28%, black 92%, transparent 100%)',
          WebkitMaskImage:
            'linear-gradient(90deg, transparent 0%, black 28%, black 92%, transparent 100%)',
        }}
      >
        {rows.map((row, i) => (
          <div key={i} className="flex overflow-hidden">
            <div
              className="atx-marquee-row flex shrink-0 gap-8 pr-8 will-change-transform"
              style={{ animation: `atx-marquee-left ${30 + i * 7}s linear infinite` }}
            >
              {[...row, ...row].map((code, j) => (
                <span
                  key={`${code}-${j}`}
                  className="font-mono text-[11px] uppercase leading-none tracking-wider text-[var(--text-muted)]"
                >
                  {code}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
