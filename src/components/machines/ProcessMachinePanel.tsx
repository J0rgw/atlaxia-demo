import { useState, useMemo, useCallback } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Cpu,
  Search,
  Star,
  Circle,
  Gauge,
  ToggleRight,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Brain,
  Activity,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/Checkbox';
import { useFavorites } from '@/hooks/useLocalStorage';
import { useSensorsConfig } from '@/hooks/useSensorsConfig';
import { useTranslation } from '@/stores/languageStore';
import type { ProcessStatus, MachineSensorData, MachineAIMetadata } from '@/types';
import type { SensorCategory } from '@/types/installation';

function calculateSensorStatus(
  value: number,
  limits: { hh?: number; h?: number; l?: number; ll?: number } | undefined
): ProcessStatus {
  if (!limits) return 'normal';
  const { hh, h, l, ll } = limits;

  if ((hh != null && value >= hh) || (ll != null && value <= ll)) {
    return 'critical';
  }
  if ((h != null && value >= h) || (l != null && value <= l)) {
    return 'warning';
  }
  return 'normal';
}

export type PanelVariant = 'advisory' | 'normal';

interface ProcessMachinePanelProps {
  sensors: MachineSensorData[];
  selectedSensorKeys: string[];
  onSensorToggle: (sensorKey: string) => void;
  aiMetadata?: Record<string, MachineAIMetadata>;
  showStatusHeader?: boolean;
  variant?: PanelVariant;
  headerTitle?: string;
  favoritesKey?: string;
  showAIMetadata?: boolean;
}

const VARIANT_STYLES: Record<
  PanelVariant,
  { header: string; headerIcon: string; headerSub: string; accent: string; icon: LucideIcon }
> = {
  advisory: {
    header: 'bg-[var(--status-advisory)]',
    headerIcon: 'text-white/80',
    headerSub: 'text-white/70',
    accent: 'text-[var(--status-advisory)]',
    icon: Cpu,
  },
  normal: {
    header: 'bg-[var(--status-normal)]',
    headerIcon: 'text-white/80',
    headerSub: 'text-white/70',
    accent: 'text-[var(--status-normal)]',
    icon: Activity,
  },
};

function StatusIndicator({ status }: { status: ProcessStatus }) {
  const config = {
    normal: { icon: CheckCircle, color: 'text-[var(--text-muted)]', bg: 'bg-[var(--bg-inset)]' },
    warning: { icon: AlertTriangle, color: 'text-[var(--status-warning)]', bg: 'bg-[var(--status-warning-muted)]' },
    critical: { icon: XCircle, color: 'text-[var(--status-critical)]', bg: 'bg-[var(--status-critical-muted)]' },
  };

  const { icon: Icon, color, bg } = config[status];

  return (
    <span className={cn('inline-flex items-center justify-center w-5 h-5 rounded-full', bg)}>
      <Icon className={cn('w-3.5 h-3.5', color)} />
    </span>
  );
}

function ProcessStatusHeader({
  categories,
  processStatuses,
  onProcessClick,
  label,
}: {
  categories: SensorCategory[];
  processStatuses: Record<string, ProcessStatus>;
  onProcessClick: (processId: string) => void;
  label: string;
}) {
  return (
    <div className="px-3 py-2 border-b border-[var(--border-subtle)] bg-[var(--bg-inset)]">
      <div className="text-xs text-[var(--text-secondary)] mb-2 font-medium">{label}</div>
      <div className="flex flex-wrap gap-1">
        {categories.map((category) => {
          const status = processStatuses[category.id] || 'normal';
          return (
            <button
              key={category.id}
              onClick={() => onProcessClick(category.id)}
              className={cn(
                'flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors',
                status === 'normal' && 'bg-[var(--bg-inset)] text-[var(--text-secondary)] hover:bg-[var(--bg-inset)]',
                status === 'warning' && 'bg-[var(--status-warning-muted)] text-[var(--status-warning)] hover:bg-[var(--status-warning-muted)]',
                status === 'critical' && 'bg-[var(--status-critical-muted)] text-[var(--status-critical)] hover:bg-[var(--status-critical-muted)]'
              )}
              title={category.name}
            >
              <span>{category.id}</span>
              <StatusIndicator status={status} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface EnrichedSensor extends MachineSensorData {
  swatName?: string;
  processId?: string;
  status?: ProcessStatus;
  hasForecast?: boolean;
}

export function ProcessMachinePanel({
  sensors,
  selectedSensorKeys,
  onSensorToggle,
  aiMetadata = {},
  showStatusHeader = true,
  variant = 'advisory',
  headerTitle,
  favoritesKey = 'machine_process_favorites',
  showAIMetadata = true,
}: ProcessMachinePanelProps) {
  const { t } = useTranslation();
  const styles = VARIANT_STYLES[variant];

  const {
    categories,
    mapToDisplayName,
    getDisplayLabel,
    getSensorRange,
    getAlarmLimits,
  } = useSensorsConfig();

  const [expandedProcesses, setExpandedProcesses] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = { favorites: true };
    categories.forEach((c) => {
      initial[c.id] = c.expanded ?? false;
    });
    return initial;
  });
  const [searchTerm, setSearchTerm] = useState('');
  const { favorites, toggleFavorite } = useFavorites(favoritesKey);

  const getSensorStatus = useCallback((tag: string, value: number): ProcessStatus => {
    const limits = getAlarmLimits(tag);
    return calculateSensorStatus(value, limits);
  }, [getAlarmLimits]);

  const calculateProcessStatus = useCallback((
    category: SensorCategory,
    sValues: Record<string, number>
  ): ProcessStatus => {
    let hasWarning = false;
    let hasCritical = false;

    for (const sensorKey of category.sensors) {
      const value = sValues[sensorKey];
      if (value !== undefined) {
        const status = getSensorStatus(sensorKey, value);
        if (status === 'critical') hasCritical = true;
        if (status === 'warning') hasWarning = true;
      }
    }

    if (hasCritical) return 'critical';
    if (hasWarning) return 'warning';
    return 'normal';
  }, [getSensorStatus]);

  const enrichedSensors = useMemo(() => {
    return sensors.map((sensor): EnrichedSensor => {
      const swatName = mapToDisplayName(sensor.key);
      const metadata = showAIMetadata ? aiMetadata[sensor.key] : undefined;
      return {
        ...sensor,
        swatName,
        hasForecast: metadata?.forecast_enabled ?? false,
      };
    });
  }, [sensors, aiMetadata, mapToDisplayName, showAIMetadata]);

  const sensorValues = useMemo(() => {
    const values: Record<string, number> = {};
    enrichedSensors.forEach((s) => {
      if (s.value == null) return;
      if (s.swatName) {
        values[s.swatName] = s.value;
      }
      values[s.key] = s.value;
    });
    return values;
  }, [enrichedSensors]);

  const processStatuses = useMemo(() => {
    const statuses: Record<string, ProcessStatus> = {};
    categories.forEach((category) => {
      statuses[category.id] = calculateProcessStatus(category, sensorValues);
    });
    return statuses;
  }, [sensorValues, categories, calculateProcessStatus]);

  const filteredSensors = useMemo(() => {
    if (!searchTerm) return enrichedSensors;
    const term = searchTerm.toLowerCase();
    return enrichedSensors.filter(
      (s) =>
        s.name.toLowerCase().includes(term) ||
        s.key.toLowerCase().includes(term) ||
        (s.swatName && s.swatName.toLowerCase().includes(term))
    );
  }, [enrichedSensors, searchTerm]);

  const sensorsByProcess = useMemo(() => {
    const grouped: Record<string, EnrichedSensor[]> = {};
    const unassigned: EnrichedSensor[] = [];

    filteredSensors.forEach((sensor) => {
      let assigned = false;
      for (const category of categories) {
        const swatName = sensor.swatName || '';
        if (category.sensors.includes(swatName)) {
          if (!grouped[category.id]) {
            grouped[category.id] = [];
          }
          const status: ProcessStatus =
            sensor.value != null ? getSensorStatus(swatName, sensor.value) : 'normal';
          grouped[category.id].push({
            ...sensor,
            processId: category.id,
            status,
          });
          assigned = true;
          break;
        }
      }
      if (!assigned) {
        unassigned.push(sensor);
      }
    });

    return { grouped, unassigned };
  }, [filteredSensors, categories, getSensorStatus]);

  const favoriteSensors = useMemo(() => {
    return filteredSensors.filter((s) => favorites.has(s.key));
  }, [filteredSensors, favorites]);

  const toggleProcess = (processId: string) => {
    setExpandedProcesses((prev) => ({
      ...prev,
      [processId]: !prev[processId],
    }));
  };

  const handleProcessClick = (processId: string) => {
    setExpandedProcesses((prev) => {
      const newState = { ...prev };
      categories.forEach((c) => {
        newState[c.id] = c.id === processId;
      });
      return newState;
    });
  };

  const renderSensorItem = (sensor: EnrichedSensor, isSensorType: boolean = true) => {
    const isSelected = selectedSensorKeys.includes(sensor.key);
    const isFavorite = favorites.has(sensor.key);
    const swatName = sensor.swatName || sensor.key;
    const range = getSensorRange(swatName);
    const hasData = sensor.value != null;
    const status = hasData ? (sensor.status || getSensorStatus(swatName, sensor.value!)) : 'normal';

    return (
      <div
        key={sensor.key}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors',
          !hasData && 'opacity-50',
          isSelected
            ? 'bg-[var(--status-advisory-muted)] text-[var(--status-advisory)]'
            : 'text-[var(--text-secondary)] hover:bg-[var(--bg-inset)]'
        )}
      >
        <span className={cn('shrink-0', isSensorType ? styles.accent : 'text-[var(--text-muted)]')}>
          {isSensorType ? (
            <Gauge className="w-3.5 h-3.5" />
          ) : (
            <ToggleRight className="w-3.5 h-3.5" />
          )}
        </span>

        <StatusIndicator status={status} />

        {showAIMetadata && sensor.hasForecast && (
          <span className="text-[var(--accent-secondary)]" title="Forecasting">
            <Brain className="w-3.5 h-3.5" />
          </span>
        )}

        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite(sensor.key);
          }}
          className={cn(
            'shrink-0 transition-colors',
            isFavorite ? 'text-[var(--status-warning)]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
          )}
          title={isFavorite ? t('removeFromFavorites') : t('addToFavorites')}
        >
          <Star className="w-4 h-4" fill={isFavorite ? 'currentColor' : 'none'} />
        </button>

        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onSensorToggle(sensor.key)}
        />

        <div
          className="flex-1 min-w-0 cursor-pointer"
          onClick={() => onSensorToggle(sensor.key)}
        >
          <div className="flex items-center gap-1">
            <span className="font-medium truncate" title={sensor.key}>
              {getDisplayLabel(swatName)}
            </span>
            {sensor.name !== swatName && (
              <span className="text-xs text-[var(--text-muted)] truncate">({sensor.name})</span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
            <span
              className={cn(
                status === 'warning' && 'text-[var(--status-warning)]',
                status === 'critical' && 'text-[var(--status-critical)]'
              )}
            >
              {sensor.value != null
                ? `${sensor.value.toFixed(2)} ${range?.unit || sensor.unit || ''}`
                : 'Sin datos'}
            </span>
            {range && (
              <span className="text-[var(--text-muted)]">
                [{range.min}-{range.max}]
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderProcessSection = (category: SensorCategory) => {
    const processSensors = sensorsByProcess.grouped[category.id] || [];
    const isExpanded = expandedProcesses[category.id];
    const status = processStatuses[category.id];

    const warningCount = processSensors.filter((s) => s.status === 'warning').length;
    const criticalCount = processSensors.filter((s) => s.status === 'critical').length;
    const forecastCount = showAIMetadata ? processSensors.filter((s) => s.hasForecast).length : 0;

    return (
      <div key={category.id} className="border-b border-[var(--border-subtle)] last:border-0">
        <button
          onClick={() => toggleProcess(category.id)}
          className={cn(
            'w-full flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors',
            status === 'normal' && 'hover:bg-[var(--bg-inset)]',
            status === 'warning' && 'bg-[var(--status-warning-muted)] hover:bg-[var(--status-warning-muted)]',
            status === 'critical' && 'bg-[var(--status-critical-muted)] hover:bg-[var(--status-critical-muted)]'
          )}
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
          ) : (
            <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />
          )}

          <StatusIndicator status={status} />

          <span className="flex-1 text-left">{category.name}</span>

          <span className="flex items-center gap-1">
            {forecastCount > 0 && !isExpanded && (
              <span className="px-1.5 py-0.5 text-xs bg-[var(--accent-secondary-muted)] text-[var(--accent-secondary)] rounded flex items-center gap-0.5">
                <Brain className="w-3 h-3" />
                {forecastCount}
              </span>
            )}
            {criticalCount > 0 && !isExpanded && (
              <span className="px-1.5 py-0.5 text-xs bg-[var(--status-critical-muted)] text-[var(--status-critical)] rounded">
                {criticalCount}
              </span>
            )}
            {warningCount > 0 && !isExpanded && (
              <span className="px-1.5 py-0.5 text-xs bg-[var(--status-warning-muted)] text-[var(--status-warning)] rounded">
                {warningCount}
              </span>
            )}
          </span>

          <span className="text-xs text-[var(--text-muted)]">({processSensors.length})</span>
        </button>

        {isExpanded && (
          <div className="pb-2">
            {processSensors.length > 0 && (
              <div className="ml-6">
                <div className="px-3 py-1 text-xs font-medium text-[var(--text-secondary)] flex items-center gap-1">
                  <Gauge className="w-3 h-3" />
                  {t('sensors')}
                </div>
                <div className="space-y-1">
                  {processSensors.map((s) => renderSensorItem(s, true))}
                </div>
              </div>
            )}

            {processSensors.length === 0 && (
              <div className="ml-6 px-3 py-2 text-xs text-[var(--text-muted)] italic">
                {t('noSensorsAvailable')}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const HeaderIcon = styles.icon;
  const title = headerTitle || t('swatProcesses');

  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-md h-full overflow-hidden flex flex-col transition-colors duration-200">
      {/* Header */}
      <div className={cn(styles.header, 'px-4 py-3')}>
        <div className="flex items-center gap-2">
          <HeaderIcon className={cn('w-4 h-4', styles.headerIcon)} />
          <h2 className="text-white font-semibold text-sm uppercase tracking-wide">
            {title}
          </h2>
        </div>
        <p className={cn('text-xs mt-1', styles.headerSub)}>
          {sensors.length} {t('sensors').toLowerCase()} - {categories.length} {t('processStatus').toLowerCase()}
        </p>
      </div>

      {/* Process status header */}
      {showStatusHeader && (
        <ProcessStatusHeader
          categories={categories}
          processStatuses={processStatuses}
          onProcessClick={handleProcessClick}
          label={t('processStatus')}
        />
      )}

      {/* Search */}
      <div className="px-3 py-2 border-b border-[var(--border-subtle)]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <input
            id="process-machine-search"
            type="text"
            placeholder={t('searchSensor')}
            aria-label={t('searchSensor')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-[var(--border-default)] rounded-lg focus:ring-2 focus:ring-[var(--status-advisory)] focus:border-[var(--status-advisory)] outline-none bg-[var(--bg-surface)] text-[var(--text-primary)]"
          />
        </div>
      </div>

      {/* Process list */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {filteredSensors.length === 0 ? (
          <div className="text-center py-8 text-[var(--text-muted)] text-sm">
            {searchTerm ? t('noSensorsFound') : t('noSensorsAvailable')}
          </div>
        ) : (
          <>
            {/* Favorites section */}
            {favoriteSensors.length > 0 && (
              <div className="border-b border-[var(--border-subtle)]">
                <button
                  onClick={() => toggleProcess('favorites')}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-[var(--status-warning)] hover:bg-[var(--status-warning-muted)] transition-colors"
                >
                  {expandedProcesses['favorites'] ? (
                    <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />
                  )}
                  <Star className="w-4 h-4 text-[var(--status-warning)] fill-[var(--status-warning)]" />
                  <span>{t('favorites')}</span>
                  <span className="ml-auto text-xs text-[var(--text-muted)]">
                    ({favoriteSensors.length})
                  </span>
                </button>
                {expandedProcesses['favorites'] && (
                  <div className="ml-2 space-y-1 py-1 pb-2">
                    {favoriteSensors.map((s) => renderSensorItem(s))}
                  </div>
                )}
              </div>
            )}

            {/* Process sections */}
            {categories.map(renderProcessSection)}

            {/* Unassigned sensors */}
            {sensorsByProcess.unassigned.length > 0 && (
              <div className="border-t border-[var(--border-subtle)]">
                <button
                  onClick={() => toggleProcess('unassigned')}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-inset)] transition-colors"
                >
                  {expandedProcesses['unassigned'] ? (
                    <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />
                  )}
                  <Circle className="w-4 h-4" />
                  <span>{t('otherSensors')}</span>
                  <span className="ml-auto text-xs text-[var(--text-muted)]">
                    ({sensorsByProcess.unassigned.length})
                  </span>
                </button>
                {expandedProcesses['unassigned'] && (
                  <div className="ml-2 space-y-1 py-1 pb-2">
                    {sensorsByProcess.unassigned.map((s) => renderSensorItem(s))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Selection summary */}
      <div className="border-t border-[var(--border-subtle)] px-4 py-2 bg-[var(--bg-inset)]">
        <div className="flex justify-between text-xs text-[var(--text-secondary)]">
          <span>
            {selectedSensorKeys.length} / {sensors.length} {t('selected')}
          </span>
          <span>{favorites.size} {t('favorites').toLowerCase()}</span>
        </div>
      </div>
    </div>
  );
}
