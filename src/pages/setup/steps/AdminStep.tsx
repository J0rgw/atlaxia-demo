/**
 * Step 4: Admin User Creation
 * Configures: admin_user.username, admin_user.email, admin_user.password
 */

import { useState } from 'react';
import { useInstallationStore } from '@/stores/installationStore';
import { cn } from '@/lib/utils';

export function AdminStep() {
  const { setupData, updateAdminUser } = useInstallationStore();
  const { admin_user } = setupData;

  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Validation
  const usernameValid = admin_user.username.length >= 3;
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(admin_user.email);
  const passwordValid = admin_user.password.length >= 8;
  const passwordsMatch = admin_user.password === confirmPassword;

  // Password strength
  const getPasswordStrength = (password: string): { level: number; label: string; color: string } => {
    if (password.length === 0) return { level: 0, label: '', color: '' };
    if (password.length < 8) return { level: 1, label: 'Muy debil', color: 'bg-[var(--status-critical)]' };

    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;

    if (strength <= 2) return { level: 2, label: 'Debil', color: 'bg-[var(--status-warning)]' };
    if (strength <= 4) return { level: 3, label: 'Media', color: 'bg-[var(--status-advisory)]' };
    return { level: 4, label: 'Fuerte', color: 'bg-[var(--status-normal)]' };
  };

  const passwordStrength = getPasswordStrength(admin_user.password);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-[var(--status-normal-muted)] flex items-center justify-center mb-3">
          <svg className="w-6 h-6 text-[var(--status-normal)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">Crear Cuenta Administrador</h2>
        <p className="text-[var(--text-secondary)]">
          Esta cuenta sera el administrador principal del sistema. Podra crear usuarios adicionales
          desde la seccion de configuracion.
        </p>
      </div>

      <div className="max-w-md mx-auto bg-[var(--bg-inset)] border border-[var(--border-subtle)] rounded-md p-4 space-y-4">
        {/* Username */}
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-[var(--text-primary)] mb-1">
            Nombre de usuario *
          </label>
          <input
            type="text"
            id="username"
            value={admin_user.username}
            onChange={(e) => updateAdminUser({ username: e.target.value })}
            placeholder="admin_planta"
            className={cn(
              'w-full h-10 px-3 bg-[var(--bg-inset)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] border rounded-md outline-none transition-colors',
              admin_user.username && !usernameValid
                ? 'border-[var(--status-critical)] focus:ring-2 focus:ring-[var(--status-critical)] focus:border-[var(--status-critical)]'
                : 'border-[var(--border-default)] focus:ring-2 focus:ring-[var(--accent-primary)]/30 focus:border-[var(--accent-primary)]'
            )}
          />
          {admin_user.username && !usernameValid && (
            <p className="mt-1 text-sm text-[var(--status-critical)]">Minimo 3 caracteres</p>
          )}
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-[var(--text-primary)] mb-1">
            Email *
          </label>
          <input
            type="email"
            id="email"
            value={admin_user.email}
            onChange={(e) => updateAdminUser({ email: e.target.value })}
            placeholder="admin@empresa.com"
            className={cn(
              'w-full h-10 px-3 bg-[var(--bg-inset)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] border rounded-md outline-none transition-colors',
              admin_user.email && !emailValid
                ? 'border-[var(--status-critical)] focus:ring-2 focus:ring-[var(--status-critical)] focus:border-[var(--status-critical)]'
                : 'border-[var(--border-default)] focus:ring-2 focus:ring-[var(--accent-primary)]/30 focus:border-[var(--accent-primary)]'
            )}
          />
          {admin_user.email && !emailValid && (
            <p className="mt-1 text-sm text-[var(--status-critical)]">Email no valido</p>
          )}
        </div>

        {/* Password */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-[var(--text-primary)] mb-1">
            Contrasena *
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              value={admin_user.password}
              onChange={(e) => updateAdminUser({ password: e.target.value })}
              placeholder="Minimo 8 caracteres"
              className={cn(
                'w-full h-10 px-3 pr-10 bg-[var(--bg-inset)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] border rounded-md outline-none transition-colors',
                admin_user.password && !passwordValid
                  ? 'border-[var(--status-critical)] focus:ring-2 focus:ring-[var(--status-critical)] focus:border-[var(--status-critical)]'
                  : 'border-[var(--border-default)] focus:ring-2 focus:ring-[var(--accent-primary)]/30 focus:border-[var(--accent-primary)]'
              )}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            >
              {showPassword ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>

          {/* Password Strength Indicator */}
          {admin_user.password && (
            <div className="mt-2">
              <div className="flex gap-1 mb-1">
                {[1, 2, 3, 4].map((level) => (
                  <div
                    key={level}
                    className={cn(
                      'h-1 flex-1 rounded',
                      level <= passwordStrength.level ? passwordStrength.color : 'bg-[var(--bg-inset)]'
                    )}
                  />
                ))}
              </div>
              <p
                className={cn(
                  'text-xs',
                  passwordStrength.level <= 2 ? 'text-[var(--status-critical)]' : passwordStrength.level <= 3 ? 'text-[var(--status-warning)]' : 'text-[var(--status-normal)]'
                )}
              >
                Fortaleza: {passwordStrength.label}
              </p>
            </div>
          )}
        </div>

        {/* Confirm Password */}
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-[var(--text-primary)] mb-1">
            Confirmar contrasena *
          </label>
          <input
            type={showPassword ? 'text' : 'password'}
            id="confirmPassword"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repite la contrasena"
            className={cn(
              'w-full h-10 px-3 bg-[var(--bg-inset)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] border rounded-md outline-none transition-colors',
              confirmPassword && !passwordsMatch
                ? 'border-[var(--status-critical)] focus:ring-2 focus:ring-[var(--status-critical)] focus:border-[var(--status-critical)]'
                : 'border-[var(--border-default)] focus:ring-2 focus:ring-[var(--accent-primary)]/30 focus:border-[var(--accent-primary)]'
            )}
          />
          {confirmPassword && !passwordsMatch && (
            <p className="mt-1 text-sm text-[var(--status-critical)]">Las contrasenas no coinciden</p>
          )}
          {confirmPassword && passwordsMatch && admin_user.password && (
            <p className="mt-1 text-sm text-[var(--status-normal)] flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Las contrasenas coinciden
            </p>
          )}
        </div>
      </div>

      {/* Security Note */}
      <div className="max-w-md mx-auto bg-[var(--status-warning-muted)] border border-[var(--status-warning)] rounded-md p-4">
        <div className="flex gap-3">
          <svg className="w-5 h-5 text-[var(--status-warning)] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <h4 className="font-medium text-[var(--status-warning)]">Importante</h4>
            <p className="text-sm text-[var(--status-warning)] mt-1">
              Guarda estas credenciales en un lugar seguro. Este sera el unico administrador con
              acceso completo al sistema. Podras crear mas usuarios desde la configuracion una vez
              iniciada la sesion.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
