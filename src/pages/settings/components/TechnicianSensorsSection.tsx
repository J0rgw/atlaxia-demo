import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Switch } from '@/components/ui/Switch';
import { Search, Gauge } from 'lucide-react';
import { useTranslation } from '@/stores/languageStore';
import { useAuthStore } from '@/stores/authStore';
import { useInstallation } from '@/hooks/useInstallation';
import { useUserViewPrefsStore } from '@/stores/userViewPrefsStore';

export function TechnicianSensorsSection() {
  const { t, language } = useTranslation();
  const canAccessSensor = useAuthStore((state) => state.canAccessSensor);
  const { sensorsConfig } = useInstallation();
  const hiddenSensors = useUserViewPrefsStore((state) => state.hiddenSensors);
  const toggleSensor = useUserViewPrefsStore((state) => state.toggleSensor);
  const [search, setSearch] = useState('');

  const sensors = Object.entries(sensorsConfig?.mapping ?? {})
    .filter(([key]) => canAccessSensor(key))
    .filter(([key, mapping]) => {
      if (!search) return true;
      const term = search.toLowerCase();
      return (
        key.toLowerCase().includes(term) ||
        (mapping.display_name?.toLowerCase().includes(term) ?? false)
      );
    })
    .sort(([a], [b]) => a.localeCompare(b));

  return (
    <Card padding="lg">
      <h3 className="font-semibold text-[var(--text-primary)] mb-1">{t('settingsMySensors')}</h3>
      <p className="text-sm text-[var(--text-secondary)] mb-4">{t('settingsMySensorsDescription')}</p>

      {sensors.length === 0 && !search ? (
        <div className="text-center py-8 text-[var(--text-secondary)]">
          <Gauge className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-3" />
          <p className="text-sm">
            {language === 'es' ? 'No hay sensores disponibles' : 'No sensors available'}
          </p>
        </div>
      ) : (
        <>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={language === 'es' ? 'Buscar sensores...' : 'Search sensors...'}
              className="w-full pl-9 pr-3 py-2 text-sm border border-[var(--border-default)] rounded-sm bg-[var(--bg-surface)] focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] outline-none"
            />
          </div>

          <div className="space-y-1.5 max-h-[480px] overflow-y-auto pr-1">
            {sensors.map(([key, mapping]) => {
              const isVisible = !hiddenSensors.includes(key);
              return (
                <div
                  key={key}
                  className="flex items-center justify-between gap-3 p-2.5 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-[var(--text-primary)] truncate">
                      {mapping.display_name || key}
                    </p>
                    <p className="text-xs text-[var(--text-muted)] truncate font-mono">{key}</p>
                  </div>
                  <Switch
                    checked={isVisible}
                    onCheckedChange={() => toggleSensor(key)}
                    aria-label={mapping.display_name || key}
                  />
                </div>
              );
            })}
            {sensors.length === 0 && search && (
              <p className="text-sm text-[var(--text-muted)] py-4 text-center">
                {language === 'es' ? 'Sin resultados' : 'No results'}
              </p>
            )}
          </div>
        </>
      )}
    </Card>
  );
}
