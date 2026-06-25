import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useAccessGateStore } from '@/stores/accessGateStore';
import { isAccessGateConfigured } from '@/lib/accessGate';
import { useInstallationStore } from '@/stores/installationStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ArrowRight, ArrowLeft, Eye, EyeOff, AlertCircle, Lock } from 'lucide-react';
import { resolveStaticUrl } from '@/lib/api';
import { HeroAnomalyChart } from '@/components/auth/HeroAnomalyChart';
import {
  useUnauthThemeBootstrap,
  readStoredThemeMode,
} from '@/hooks/useUnauthThemeBootstrap';

const IS_DEMO = import.meta.env.MODE === 'demo';
const TOUR_WIZARD_FLAG = 'demo.tourWizard';

type GateIntent = 'demo' | 'tour';

export function LoginPage() {
  const [username, setUsername] = useState(IS_DEMO ? 'demo' : '');
  const [password, setPassword] = useState(IS_DEMO ? 'demo' : '');
  const [showPassword, setShowPassword] = useState(false);

  // Which CTA the visitor pressed on the demo landing. When set (and the gate
  // is still locked) we show the password screen before running that action.
  const [gateIntent, setGateIntent] = useState<GateIntent | null>(null);
  const gateUnlocked = useAccessGateStore((state) => state.unlocked);

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

  const runIntent = (intent: GateIntent) => {
    if (intent === 'demo') {
      void handleDemoSignIn();
    } else {
      handleTourWizard();
    }
  };

  // Landing CTAs funnel through here. Once the gate is unlocked the action
  // runs immediately; otherwise we show the password screen first.
  const requestAccess = (intent: GateIntent) => {
    if (gateUnlocked) {
      runIntent(intent);
    } else {
      setGateIntent(intent);
    }
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
    if (gateIntent && !gateUnlocked) {
      return (
        <DemoAccessGate
          installationName={installationName}
          logoUrl={logoUrl}
          intent={gateIntent}
          isLoading={isLoading}
          onBack={() => setGateIntent(null)}
          onUnlocked={() => runIntent(gateIntent)}
        />
      );
    }

    return (
      <DemoLoginSurface
        installationName={installationName}
        logoUrl={logoUrl}
        isLoading={isLoading}
        onDemoSignIn={() => requestAccess('demo')}
        onTourWizard={() => requestAccess('tour')}
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
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-8 lg:px-12 lg:py-10">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img src={logoUrl} alt="" className="h-10 w-10 shrink-0 rounded-sm object-cover" />
            ) : (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-[var(--accent-primary)]/15 ring-1 ring-[var(--accent-primary)]/30">
                <span className="text-sm font-bold text-[var(--accent-primary)]">
                  {installationName.slice(0, 2).toUpperCase()}
                </span>
              </div>
            )}
            <span className="text-base font-semibold tracking-tight">{installationName}</span>
          </div>
        </header>

        <section className="flex flex-1 items-center">
          <div className="grid w-full items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,34rem)] lg:gap-16">
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
                className="group inline-flex h-14 w-full max-w-[22.4rem] items-center justify-between rounded-md bg-[var(--accent-primary)] px-5 text-base font-semibold text-white shadow-[0_8px_24px_-12px_var(--accent-primary)] transition-opacity hover:opacity-95 disabled:opacity-60"
              >
                <span>{isLoading ? 'Ingresando...' : 'Entrar como administrador demo'}</span>
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </button>

              <button
                type="button"
                onClick={onTourWizard}
                className="group inline-flex h-14 w-full max-w-[22.4rem] items-center justify-between rounded-md border border-[var(--border-default)] px-5 text-base font-medium text-[var(--text-primary-300)] transition-colors hover:border-[var(--accent-primary)]/60 hover:bg-[var(--bg-surface)]"
              >
                <span>recorrer el asistente de configuracion</span>
                <ArrowRight className="h-5 w-5 opacity-70 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </button>
            </div>
          </div>

            <HeroAnomalyChart className="hidden w-full lg:block" />
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

interface DemoAccessGateProps {
  installationName: string;
  logoUrl: string | null;
  intent: GateIntent;
  isLoading: boolean;
  onBack: () => void;
  onUnlocked: () => void;
}

// Password gate shown between the landing CTAs and the demo. Both landing
// buttons route here first; only the correct password lets them through. The
// password is verified client-side against a PBKDF2 hash (see lib/accessGate).
function DemoAccessGate(props: DemoAccessGateProps) {
  const { installationName, logoUrl, intent, isLoading, onBack, onUnlocked } = props;

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const unlock = useAccessGateStore((state) => state.unlock);
  const verifying = useAccessGateStore((state) => state.verifying);
  const error = useAccessGateStore((state) => state.error);
  const clearError = useAccessGateStore((state) => state.clearError);

  const configured = isAccessGateConfigured();
  const busy = verifying || isLoading;

  const intentLabel =
    intent === 'demo' ? 'Entrar como administrador demo' : 'Recorrer el asistente de configuración';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const ok = await unlock(password);
    if (ok) onUnlocked();
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[var(--bg-base)] text-[var(--text-primary)]">
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-10">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <img src={logoUrl} alt="" className="h-10 w-10 shrink-0 rounded-sm object-cover" />
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-[var(--accent-primary)]/15 ring-1 ring-[var(--accent-primary)]/30">
              <span className="text-sm font-bold text-[var(--accent-primary)]">
                {installationName.slice(0, 2).toUpperCase()}
              </span>
            </div>
          )}
          <span className="text-base font-semibold tracking-tight">{installationName}</span>
        </div>

        <div className="mt-10">
          <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.25em] text-[var(--accent-primary)]">
            <Lock className="h-3.5 w-3.5" aria-hidden="true" />
            // acceso restringido
          </p>
          <h1 className="mt-4 text-3xl font-semibold leading-tight tracking-tight">
            Introduce la contraseña
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
            Este demo es privado. Continuarás a:{' '}
            <span className="text-[var(--text-primary)]">{intentLabel}</span>.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">
              Contraseña de acceso
            </label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) clearError();
                }}
                placeholder="Introduce la contraseña del demo"
                className="w-full pr-10"
                autoFocus
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {!configured && (
            <p className="flex items-baseline gap-2 border-l-2 border-[var(--status-warning)] pl-3 font-mono text-[11px] leading-relaxed tracking-tight text-[var(--status-warning)]">
              <span aria-hidden="true" className="text-[var(--status-warning)]/50">//</span>
              <span>acceso no configurado · npm run gate:generate</span>
            </p>
          )}

          {error && (
            <p
              role="alert"
              aria-live="assertive"
              className="flex items-baseline gap-2 border-l-2 border-[var(--status-critical)] pl-3 font-mono text-[11px] uppercase leading-relaxed tracking-[0.18em] text-[var(--status-critical)]"
            >
              <span aria-hidden="true" className="text-[var(--status-critical)]/50">//</span>
              <span>error: {error}</span>
            </p>
          )}

          <button
            type="submit"
            disabled={busy || !configured}
            className="group inline-flex h-14 w-full items-center justify-between rounded-md bg-[var(--accent-primary)] px-5 text-base font-semibold text-white shadow-[0_8px_24px_-12px_var(--accent-primary)] transition-opacity hover:opacity-95 disabled:opacity-60"
          >
            <span>{busy ? 'Verificando...' : 'Acceder'}</span>
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={onBack}
            className="group inline-flex items-center gap-1.5 text-sm font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" aria-hidden="true" />
            Volver
          </button>
        </form>
      </div>
    </main>
  );
}

// Watermark-style backdrop: a faint grid plus, at the bottom-right, several
// rows of SWAT sensor codes that drift leftward like a live telemetry ticker.
// Aria-hidden so it stays out of the accessibility tree, and the marquee is
// disabled under prefers-reduced-motion.
