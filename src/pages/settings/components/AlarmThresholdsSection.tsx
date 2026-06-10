import { useState, useMemo, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { AlertTriangle, Search } from 'lucide-react';
import type { SensorMapping } from '@/types/installation';
import type { LocalInstallationConfig } from './InstallationConfigTab';

interface Props {
  localConfig: LocalInstallationConfig;
  setLocalConfig: React.Dispatch<React.SetStateAction<LocalInstallationConfig | null>>;
  language: string;
}

type LimitField = 'alarm_hh' | 'alarm_h' | 'alarm_l' | 'alarm_ll';

const LIMIT_COLUMNS: { field: LimitField; label: string; description: string }[] = [
  { field: 'alarm_hh', label: 'HH', description: 'High-High' },
  { field: 'alarm_h', label: 'H', description: 'High' },
  { field: 'alarm_l', label: 'L', description: 'Low' },
  { field: 'alarm_ll', label: 'LL', description: 'Low-Low' },
];

export function AlarmThresholdsSection({ localConfig, setLocalConfig, language }: Props) {
  const [search, setSearch] = useState('');

  const sensors = useMemo(() => {
    const entries = Object.entries(localConfig.sensors_config.mapping);
    const lower = search.trim().toLowerCase();
    if (!lower) return entries;
    return entries.filter(([id, m]) =>
      id.toLowerCase().includes(lower) || (m.display_name ?? '').toLowerCase().includes(lower),
    );
  }, [localConfig.sensors_config.mapping, search]);

  const updateLimit = useCallback(
    (sensorId: string, field: LimitField, raw: string) => {
      const parsed = raw === '' ? undefined : Number(raw);
      if (parsed !== undefined && Number.isNaN(parsed)) return;
      setLocalConfig((prev) => {
        if (!prev) return prev;
        const current = prev.sensors_config.mapping[sensorId];
        if (!current) return prev;
        const updated: SensorMapping = { ...current, [field]: parsed };
        return {
          ...prev,
          sensors_config: {
            ...prev.sensors_config,
            mapping: { ...prev.sensors_config.mapping, [sensorId]: updated },
          },
        };
      });
    },
    [setLocalConfig],
  );

  const totalConfigured = Object.values(localConfig.sensors_config.mapping).filter(
    (m) => m.alarm_hh != null || m.alarm_h != null || m.alarm_l != null || m.alarm_ll != null,
  ).length;

  return (
    <Card padding="lg">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h3 className="font-semibold text-[var(--text-primary)]">
            {language === 'es' ? 'Limites de alarma ISA-18.2' : 'ISA-18.2 alarm limits'}
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            {language === 'es'
              ? 'Configura HH (alta-alta), H (alta), L (baja), LL (baja-baja) por sensor.'
              : 'Configure HH (high-high), H (high), L (low), LL (low-low) per sensor.'}
          </p>
        </div>
        <div className="text-right text-xs text-[var(--text-secondary)] flex-shrink-0">
          <p>
            <span className="text-[var(--accent-primary)] font-semibold text-lg">{totalConfigured}</span>
            {' / '}
            {sensors.length}
          </p>
          <p>{language === 'es' ? 'con limites' : 'with limits'}</p>
        </div>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={language === 'es' ? 'Buscar sensores...' : 'Search sensors...'}
          className="w-full pl-9 pr-4 py-2 text-sm border border-[var(--border-default)] rounded-lg focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] outline-none"
        />
      </div>

      {sensors.length === 0 ? (
        <div className="text-center py-8 text-[var(--text-secondary)]">
          <AlertTriangle className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3" />
          <p>{language === 'es' ? 'No hay sensores configurados' : 'No sensors configured'}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-subtle)]">
                <th className="text-left font-semibold text-[var(--text-secondary)] py-2 pr-3">
                  {language === 'es' ? 'Sensor' : 'Sensor'}
                </th>
                {LIMIT_COLUMNS.map((col) => (
                  <th
                    key={col.field}
                    className="text-center font-semibold text-[var(--text-secondary)] py-2 px-2"
                    title={col.description}
                  >
                    {col.label}
                  </th>
                ))}
                <th className="text-left font-semibold text-[var(--text-secondary)] py-2 px-2">
                  {language === 'es' ? 'Unidad' : 'Unit'}
                </th>
              </tr>
            </thead>
            <tbody>
              {sensors.map(([id, mapping]) => (
                <tr key={id} className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-inset)]">
                  <td className="py-2 pr-3">
                    <p className="text-[var(--text-primary)] font-medium truncate max-w-[280px]" title={mapping.display_name || id}>
                      {mapping.display_name || id}
                    </p>
                    <p className="text-xs text-[var(--text-muted)] font-mono truncate max-w-[280px]">{id}</p>
                  </td>
                  {LIMIT_COLUMNS.map((col) => (
                    <td key={col.field} className="px-2 py-2">
                      <input
                        type="number"
                        step="any"
                        value={mapping[col.field] ?? ''}
                        onChange={(e) => updateLimit(id, col.field, e.target.value)}
                        className="w-20 text-right px-2 py-1 text-sm border border-[var(--border-default)] rounded focus:ring-1 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] outline-none font-readout"
                        placeholder="—"
                      />
                    </td>
                  ))}
                  <td className="px-2 py-2 text-[var(--text-secondary)] text-xs">{mapping.unit ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
