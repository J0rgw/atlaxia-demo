import { useMemo } from 'react';
import { Card } from '@/components/ui/Card';
import { KeyRound, Check, X } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useInstallationStore } from '@/stores/installationStore';

interface Props {
  language: string;
}

function StatField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">{label}</p>
      <p className="text-sm text-[var(--text-primary)] mt-0.5 break-words">{value ?? '—'}</p>
    </div>
  );
}

export function LicenseSection({ language }: Props) {
  const session = useAuthStore((s) => s.session);
  const config = useInstallationStore((s) => s.config);

  const license = session?.license ?? null;

  const formattedCompletedAt = useMemo(() => {
    if (!config?.setup_completed_at) return null;
    try {
      return new Date(config.setup_completed_at).toLocaleString(language === 'es' ? 'es-ES' : 'en-US');
    } catch {
      return config.setup_completed_at;
    }
  }, [config?.setup_completed_at, language]);

  const formattedExpiresAt = useMemo(() => {
    if (!license?.expires_at) return null;
    try {
      return new Date(license.expires_at).toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US');
    } catch {
      return license.expires_at;
    }
  }, [license?.expires_at, language]);

  const enabledPagesCount = config?.pages_config.enabled.length ?? 0;
  const totalSensors = Object.keys(config?.sensors_config.mapping ?? {}).length;
  const totalCategories = config?.sensors_config.categories.length ?? 0;

  return (
    <div className="space-y-4">
      <Card padding="lg">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h3 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-[var(--accent-primary)]" />
              {language === 'es' ? 'Licencia' : 'License'}
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              {language === 'es'
                ? 'Detalles de la licencia activa para esta instalacion.'
                : 'Active license details for this installation.'}
            </p>
          </div>
          {license ? (
            license.is_active ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--status-normal)] bg-[var(--status-normal)]/10 px-2 py-1 rounded">
                <Check className="w-3 h-3" />
                {language === 'es' ? 'Activa' : 'Active'}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--status-critical)] bg-[var(--status-critical)]/10 px-2 py-1 rounded">
                <X className="w-3 h-3" />
                {language === 'es' ? 'Inactiva' : 'Inactive'}
              </span>
            )
          ) : null}
        </div>

        {license ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <StatField label={language === 'es' ? 'Nombre' : 'Name'} value={license.name} />
            <StatField label={language === 'es' ? 'Codigo' : 'Code'} value={<span className="font-mono">{license.code}</span>} />
            <StatField
              label={language === 'es' ? 'Expira' : 'Expires'}
              value={formattedExpiresAt ?? (language === 'es' ? 'Sin expiracion' : 'No expiry')}
            />
            <StatField
              label={language === 'es' ? 'Paginas habilitadas (licencia)' : 'License-enabled pages'}
              value={license.enabled_pages.length}
            />
            <StatField
              label={language === 'es' ? 'Sensores habilitados (licencia)' : 'License-enabled sensors'}
              value={license.enabled_sensors.length}
            />
            <StatField
              label={language === 'es' ? 'Creada' : 'Created'}
              value={new Date(license.created_at).toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US')}
            />
          </div>
        ) : (
          <p className="text-sm text-[var(--text-secondary)]">
            {language === 'es'
              ? 'Esta sesion no tiene una licencia asociada (superusuario sin restricciones).'
              : 'This session has no license attached (unrestricted superuser).'}
          </p>
        )}
      </Card>

      <Card padding="lg">
        <h3 className="font-semibold text-[var(--text-primary)] mb-3">
          {language === 'es' ? 'Resumen del sistema' : 'System summary'}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-2xl font-bold text-[var(--accent-primary)]">{enabledPagesCount}</p>
            <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wide">
              {language === 'es' ? 'Paginas activas' : 'Active pages'}
            </p>
          </div>
          <div>
            <p className="text-2xl font-bold text-[var(--text-primary)]">{totalSensors}</p>
            <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wide">
              {language === 'es' ? 'Sensores' : 'Sensors'}
            </p>
          </div>
          <div>
            <p className="text-2xl font-bold text-[var(--text-primary)]">{totalCategories}</p>
            <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wide">
              {language === 'es' ? 'Categorias' : 'Categories'}
            </p>
          </div>
          <div>
            <p className="text-2xl font-bold text-[var(--text-primary)]">
              {session?.effective_pages.length ?? 0}
            </p>
            <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wide">
              {language === 'es' ? 'Tus paginas' : 'Your pages'}
            </p>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-[var(--border-subtle)] grid grid-cols-1 md:grid-cols-2 gap-4">
          <StatField
            label={language === 'es' ? 'Setup completado' : 'Setup completed'}
            value={formattedCompletedAt ?? (language === 'es' ? 'Sin completar' : 'Not completed')}
          />
          <StatField
            label={language === 'es' ? 'Instalacion' : 'Installation'}
            value={config?.installation_name}
          />
          <StatField
            label={language === 'es' ? 'Tema' : 'Theme'}
            value={config?.theme_variant?.toUpperCase()}
          />
          <StatField
            label={language === 'es' ? 'Tu rol' : 'Your role'}
            value={session?.role}
          />
        </div>
      </Card>
    </div>
  );
}
