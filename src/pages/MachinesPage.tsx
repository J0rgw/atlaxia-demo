import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { DiagnosticsPanel, ProcessStrip } from '@/components/machines';
import type { DiagnosticInfo } from '@/components/machines';
import { SensorCard, SampleInstrumentCard } from '@/components/sensors';
import { SAMPLE_INSTRUMENTS } from '@/config/sampleInstruments';
import { Button } from '@/components/ui/Button';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { api } from '@/lib/api';
import type {
  MachineSensorData,
  MachineSensorsResponse,

  SensorEvaluation,
} from '@/types';
import { useSensorsConfig } from '@/hooks/useSensorsConfig';
import {
  evaluateSensor,
  evaluateAllSensors,
  getIndustrialSensor,
} from '@/config/industrial-sensors';
import { getInstrumentIconByTag, getInstrumentLabel } from '@/lib/instrumentIcons';
import { useTelemetryContext } from '@/contexts/TelemetryContext';
import { useMachinesStore } from '@/stores/machinesStore';
import { useTranslation } from '@/stores/languageStore';
import { useFavorites, useLocalStorage } from '@/hooks/useLocalStorage';
import { useTelemetryData } from '@/hooks/useTelemetryData';

export function MachinesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Clicking a card's chart shortcut deep-links to the telemetry page with
  // that sensor pre-selected. The telemetry page reads ?sensor=<key> on
  // mount and prepends it to its selected list.
  const openSensorInTelemetry = useCallback(
    (sensorKey: string) => {
      navigate(`/telemetry?sensor=${encodeURIComponent(sensorKey)}`);
    },
    [navigate],
  );

  const selectedProcess = useMachinesStore((s) => s.selectedProcess);
  const toggleSelectedProcess = useMachinesStore((s) => s.toggleSelectedProcess);
  const setSelectedProcess = useMachinesStore((s) => s.setSelectedProcess);
  const showDiagnostics = useMachinesStore((s) => s.showDiagnostics);
  const toggleDiagnostics = useMachinesStore((s) => s.toggleDiagnostics);

  const [sensors, setSensors] = useState<MachineSensorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toggleFavorite, isFavorite } = useFavorites('machine_process_favorites');
  // Test palette: show one example card per ISA device type (valve, pump, UV, …)
  // since the live demo feed only emits analog transmitters. Off by default so
  // the client-facing grid stays clean.
  const [showTypeSamples, setShowTypeSamples] = useLocalStorage<boolean>(
    'machines_show_type_samples',
    false,
  );

  const { categories, mapToDisplayName, getDisplayLabel, isSensorConfigured, getSensorMapping, getSensorRange, getAlarmLimits, getConfiguredTags, topology } = useSensorsConfig();

  const {
    rawSensorValues,
    sensorValues,
    sensorHistory,
    connectionStatus,
    dataFreshness,
    lastUpdateTime,
    secondsSinceUpdate,
    isLive,
    reconnect,
    getSensorTrend: contextGetSensorTrend,
    getHistoryKey,
  } = useTelemetryContext();

  // Build diagnostics from context
  const diagnostics = useMemo<DiagnosticInfo>(() => {
    const unmapped: string[] = [];
    let mappedCount = 0;

    Object.keys(rawSensorValues).forEach((key) => {
      const displayName = mapToDisplayName(key);
      if (displayName && isSensorConfigured(displayName)) {
        mappedCount++;
      } else {
        unmapped.push(key);
      }
    });

    return {
      lastFetchTime: lastUpdateTime,
      receivedSensorsCount: Object.keys(rawSensorValues).length,
      mappedSensorsCount: mappedCount,
      unmappedKeys: unmapped,
      connectionStatus,
      dataFreshness,
      isLive,
      secondsSinceUpdate,
    };
  }, [rawSensorValues, connectionStatus, dataFreshness, isLive, lastUpdateTime, secondsSinceUpdate, mapToDisplayName, isSensorConfigured]);

  const telemetryData = useTelemetryData(sensorHistory);

  // Compute ISA evaluations and alarms
  const { processStatuses, sensorEvaluations } = useMemo(() => {
    const timestamp = Date.now();
    const alarms = evaluateAllSensors(sensorValues, timestamp);

    const evaluations: Record<string, SensorEvaluation> = {};
    Object.keys(sensorValues).forEach((tag) => {
      const eval_ = evaluateSensor(tag, sensorValues[tag], timestamp);
      if (eval_) evaluations[tag] = eval_;
    });

    // Compute process statuses from config-driven categories
    const statuses = categories.map((cat) => {
      let worstStatus: 'normal' | 'warning' | 'critical' = 'normal';
      let sensorsInAlarm = 0;

      for (const sensorTag of cat.sensors) {
        const value = sensorValues[sensorTag];
        if (value === undefined) continue;

        const limits = getAlarmLimits(sensorTag);
        if (!limits) continue;
        const { hh, h, l, ll } = limits;
        const isCritical = (hh != null && value >= hh) || (ll != null && value <= ll);
        const isWarning = (h != null && value >= h) || (l != null && value <= l);

        if (isCritical) { worstStatus = 'critical'; sensorsInAlarm++; }
        else if (isWarning) {
          if (worstStatus !== 'critical') worstStatus = 'warning';
          sensorsInAlarm++;
        }
      }

      return {
        id: cat.id,
        name: cat.name,
        status: worstStatus,
        activeAlarms: alarms.filter((a) => cat.sensors.includes(a.sensorTag)),
        sensorCount: cat.sensors.length,
        sensorsInAlarm,
        lastUpdate: timestamp,
      };
    });

    return { processStatuses: statuses, sensorEvaluations: evaluations };
  }, [sensorValues, categories, getAlarmLimits]);

  // Build sensor tags map and topology for the process flow diagram
  const processSensorTags = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const cat of categories) map[cat.id] = cat.sensors;
    return map;
  }, [categories]);

  const processTopology = useMemo(() => {
    if (topology) return topology;
    // Fallback: linear chain of all categories
    return { mainFlow: categories.map((c) => c.id), branches: [] };
  }, [topology, categories]);

  // Filter sensors by selected process (uses config-driven categories)
  const filteredSensors = useMemo(() => {
    if (!selectedProcess) return sensors;
    const category = categories.find((c) => c.id === selectedProcess);
    if (!category) return sensors;
    return sensors.filter((sensor) => {
      const displayName = mapToDisplayName(sensor.key);
      return displayName && category.sensors.includes(displayName);
    });
  }, [sensors, selectedProcess, categories, mapToDisplayName]);

  // Card-view reordering: surface abnormality first so an operator scanning
  // top-to-bottom hits critical → warning → normal. Sensors without data
  // sink to the bottom (they can't be classified).
  const sortedSensors = useMemo(() => {
    const rank = (s: typeof filteredSensors[number]): number => {
      const displayName = mapToDisplayName(s.key);
      const ev = displayName ? sensorEvaluations[displayName] : undefined;
      if (!ev || s.value == null) return 3;
      if (ev.status === 'critical') return 0;
      if (ev.status === 'warning') return 1;
      return 2;
    };
    return [...filteredSensors].sort((a, b) => rank(a) - rank(b));
  }, [filteredSensors, sensorEvaluations, mapToDisplayName]);

  // Fetch sensor list on mount + poll while the page is open. ETL→BFF WS
  // deltas aren't wired yet, so without HTTP polling the values would freeze
  // at whatever the first fetch returned. 2 s sits below the BFF Redis cache
  // TTL (30 s) so repeat polls hit the cached page rather than TB.
  useEffect(() => {
    let cancelled = false;
    const fetchSensors = async () => {
      try {
        const response = await api.get<MachineSensorsResponse>('/api/machines/sensors');
        if (cancelled) return;

        // Build lookup of API sensors by their display name (ISA tag)
        const apiByTag = new Map<string, MachineSensorData>();
        for (const s of response.sensors) {
          const dn = mapToDisplayName(s.key);
          if (dn) apiByTag.set(dn, s);
        }

        // Seed full sensor list from config, populate values from API
        const configuredTags = getConfiguredTags();
        const fullSensors: MachineSensorData[] = configuredTags.map((tag) => {
          const apiSensor = apiByTag.get(tag);
          if (apiSensor) return apiSensor;
          const mapping = getSensorMapping(tag);
          return {
            key: tag,
            name: tag,
            device_id: '',
            device_name: '',
            value: null,
            timestamp: 0,
            unit: mapping?.unit,
          };
        });

        // Append any API sensors not matched by config (unrecognized devices)
        for (const s of response.sensors) {
          const dn = mapToDisplayName(s.key);
          if (!dn || !configuredTags.includes(dn)) {
            fullSensors.push(s);
          }
        }

        setSensors(fullSensors);
        setError(null);
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        console.error('Error fetching machine sensors:', err);
        setError(t('loadingMachineSensors'));
        setLoading(false);
        // A transient fetch failure (e.g. MSW's service worker still waking up
        // after the tab returns from the background) must NOT collapse the page
        // into the "No machine sensors / verify ThingsBoard" empty state. Keep
        // any sensors we already have; if we have none yet, seed the grid from
        // config (values null) so cards render and fill in on the next poll.
        // See .demo-plan/0-bug-background-tab-freeze.md.
        setSensors((prev) => {
          if (prev.length > 0) return prev;
          return getConfiguredTags().map((tag) => {
            const mapping = getSensorMapping(tag);
            return {
              key: tag,
              name: tag,
              device_id: '',
              device_name: '',
              value: null,
              timestamp: 0,
              unit: mapping?.unit,
            };
          });
        });
      }
    };
    fetchSensors();
    const interval = setInterval(fetchSensors, 2000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [t, mapToDisplayName, getConfiguredTags, getSensorMapping]);

  // Update sensor list with real-time values
  useEffect(() => {
    if (Object.keys(rawSensorValues).length > 0) {
      setSensors((prev) =>
        prev.map((sensor) => ({
          ...sensor,
          value: rawSensorValues[sensor.key] ?? sensor.value,
          timestamp: lastUpdateTime || sensor.timestamp,
        }))
      );
      setError(null);
    }
  }, [rawSensorValues, lastUpdateTime]);

  const handleFavoriteToggle = (sensorKey: string) => {
    toggleFavorite(sensorKey);
  };

  const getSensorTrend = (key: string) => contextGetSensorTrend(key);

  if (loading && sensors.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center text-[var(--text-secondary)]">
          {t('loadingMachineSensors')}
        </div>
      </div>
    );
  }

  if (!loading && sensors.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center text-[var(--text-secondary)]">
          <p className="mb-2">{t('noMachineSensors')}</p>
          <p className="text-sm">{t('verifyThingsBoard')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Diagnostics */}
      <DiagnosticsPanel
        diagnostics={diagnostics}
        isOpen={showDiagnostics}
        onToggle={toggleDiagnostics}
        onReconnect={reconnect}
      />

      {/* Process Flow Diagram - Full Width */}
      <div className="flex-shrink-0">
        <ErrorBoundary level="section">
          <ProcessStrip
            processStatuses={processStatuses}
            selectedProcess={selectedProcess}
            onProcessClick={(p: string) => toggleSelectedProcess(p)}
            sensorValues={sensorValues}
            processSensorTags={processSensorTags}
            topology={processTopology}
            className="w-full"
          />
        </ErrorBoundary>
      </div>

      {/* Main content — full-width cards/charts grid */}
      <div className="flex-1 flex flex-col">
          {/* View Mode Toggle */}
          <div className="flex items-center justify-between mb-3 flex-shrink-0">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                {selectedProcess
                  ? `${t('sensorsOf')} ${categories.find((c) => c.id === selectedProcess)?.name || selectedProcess}`
                  : t('allSensors')}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={showTypeSamples ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setShowTypeSamples((prev) => !prev)}
                title="Muestra una tarjeta de ejemplo por cada tipo de dispositivo ISA (válvula, bomba, UV, …)"
              >
                {showTypeSamples ? 'Ocultar tipos de sensor' : 'Mostrar tipos de sensor'}
              </Button>
              {selectedProcess && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedProcess(null)}
                >
                  {t('viewAll')}
                </Button>
              )}
            </div>
          </div>

          {loading && (
            <div className="text-center text-[var(--text-secondary)] py-4">
              {t('loadingThingsBoard')}
            </div>
          )}

          {error && (
            <div className="text-center text-[var(--status-critical)] py-4">{error}</div>
          )}

          {/* Cards grid — the only content view on this page. Chart drilldown
              happens on /telemetry via card click. */}
          <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin">
            {/* Type gallery (test aid): one example card per ISA device type so
                every instrument icon can be verified, including types the live
                feed never sends (valve, pump, UV). Toggled from the header. */}
            {showTypeSamples && (
              <div className="mb-5">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-sm font-semibold text-[var(--text-secondary)]">
                    Tipos de sensor (ejemplos de prueba)
                  </h3>
                  <span className="text-xs text-[var(--text-muted)]">
                    — una tarjeta por cada tipo de dispositivo ISA
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                  {SAMPLE_INSTRUMENTS.map((sample) => (
                    <SampleInstrumentCard key={sample.tag} sample={sample} />
                  ))}
                </div>
                <div className="border-t border-[var(--border-subtle)]/60 mt-5" />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                {sortedSensors.map((sensor) => {
                  const displayName = mapToDisplayName(sensor.key) || sensor.name;
                  const industrialSensor = getIndustrialSensor(displayName);
                  const evaluation = sensorEvaluations[displayName];
                  const history = telemetryData[getHistoryKey(sensor.key)] || [];
                  const { trend, percent } = getSensorTrend(sensor.key);
                  const hasData = sensor.value != null;
                  const range = getSensorRange(displayName);
                  const label = getDisplayLabel(displayName);
                  const DeviceIcon = getInstrumentIconByTag(displayName);
                  const deviceLabel = getInstrumentLabel(displayName);

                  if (industrialSensor) {
                    return (
                      <ErrorBoundary key={sensor.key} level="widget">
                        <SensorCard
                          sensor={industrialSensor}
                          evaluation={evaluation}
                          value={sensor.value}
                          timestamp={sensor.timestamp}
                          trend={trend}
                          trendPercent={percent}
                          sparklineData={history.slice(-20).map((h) => h.value)}
                          isFavorite={isFavorite(sensor.key)}
                          isLive={isLive}
                          onCardClick={() => openSensorInTelemetry(sensor.key)}
                          onChartClick={() => openSensorInTelemetry(sensor.key)}
                          onFavoriteToggle={() => handleFavoriteToggle(sensor.key)}
                        />
                      </ErrorBoundary>
                    );
                  }

                  // Fallback card (no IndustrialSensor metadata) still
                  // shows an ISA-101 status border so it's visually
                  // consistent with the SensorCard tiles.
                  const fallbackStatus = evaluation?.status ?? 'normal';
                  const fallbackBorder =
                    fallbackStatus === 'critical'
                      ? 'border-[var(--status-critical)] border-l-4 border-l-[var(--status-critical)] ring-1 ring-[var(--status-critical)]/40'
                      : fallbackStatus === 'warning'
                      ? 'border-[var(--status-warning)] border-l-4 border-l-[var(--status-warning)]'
                      : 'border-[var(--border-subtle)]';
                  return (
                    <div
                      key={sensor.key}
                      onClick={() => openSensorInTelemetry(sensor.key)}
                      className={cn(
                        'rounded-md border p-4 transition-all duration-200 hover:shadow-md cursor-pointer',
                        'bg-[var(--bg-surface)]',
                        fallbackBorder,
                        !hasData && 'opacity-60'
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <DeviceIcon
                            className="w-4 h-4 flex-shrink-0 text-[var(--text-secondary)]"
                            aria-label={deviceLabel}
                          >
                            <title>{deviceLabel}</title>
                          </DeviceIcon>
                          <h3 className="font-bold text-[var(--text-primary)] text-sm truncate">{label}</h3>
                        </div>
                        {isLive && hasData && (
                          <span className="w-2 h-2 rounded-full bg-[var(--status-normal)] animate-pulse" />
                        )}
                      </div>
                      <div className="flex items-baseline gap-2 mb-3">
                        <span className="font-readout font-bold text-3xl leading-none text-[var(--text-primary)]">
                          {hasData ? sensor.value!.toFixed(2) : '--'}
                        </span>
                        {hasData && range?.unit && (
                          <span className="text-sm text-[var(--text-secondary)]">{range.unit}</span>
                        )}
                      </div>
                      {!hasData && (
                        <span className="text-xs text-[var(--text-muted)]">Sin datos</span>
                      )}
                      <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)]/50 dark:border-[var(--border-subtle)] mt-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); openSensorInTelemetry(sensor.key); }}
                          className="text-xs text-[var(--status-advisory)] hover:opacity-80"
                        >
                          {t('charts')}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleFavoriteToggle(sensor.key); }}
                          className={cn('text-xs', isFavorite(sensor.key) ? 'text-amber-500' : 'text-[var(--text-muted)]')}
                        >
                          {isFavorite(sensor.key) ? '★' : '☆'}
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
      </div>
    </div>
  );
}
