import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  DndContext,
  closestCenter,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { ProcessMachinePanel, AreaBandChart } from '@/components/machines';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { PageWidgetWrapper } from '@/components/ui/PageWidgetWrapper';
import { api } from '@/lib/api';
import type { MachineSensorData, MachineSensorsResponse } from '@/types';
import { useSensorsConfig } from '@/hooks/useSensorsConfig';
import { useTelemetryContext } from '@/contexts/TelemetryContext';
import { useVariablesStore } from '@/stores/variablesStore';
import { useTranslation } from '@/stores/languageStore';
import { useFavorites } from '@/hooks/useLocalStorage';
import { useWidgetSync } from '@/hooks/useWidgetSync';
import { useDndSensors } from '@/hooks/useDndSensors';

const FAVORITES_STORAGE_KEY = 'process_sensor_favorites';
// HTTP poll cadence for /api/machines/sensors. Used both as a baseline
// freshness path and as the only refresh path while ETL→BFF WS deltas
// aren't wired (see backend follow-up). Lower than the BFF Redis cache TTL
// so we always read the cached page rather than the upstream TB query.
const SENSORS_POLL_MS = 2000;

export function VariablesPage() {
  const { t } = useTranslation();
  const {
    editMode,
    widgets, reorderWidgets, setWidgets, setWidgetSize, removeWidget,
  } = useVariablesStore();

  // Deep-link entry: callers (e.g. machines-page card → "Graficos") navigate
  // here with ?sensor=<key>. We pin that sensor in the initial selection
  // then strip the param so a reload doesn't keep forcing it.
  const [searchParams, setSearchParams] = useSearchParams();
  const incomingSensor = searchParams.get('sensor');

  const [sensors, setSensors] = useState<MachineSensorData[]>([]);
  const [selectedSensorKeys, setSelectedSensorKeys] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isFavorite } = useFavorites(FAVORITES_STORAGE_KEY);
  const initializedRef = useRef(false);

  const { mapToDisplayName, getDisplayLabel, getSensorMapping, getSensorRange, getConfiguredTags } = useSensorsConfig();

  const {
    rawSensorValues,
    lastUpdateTime,
    isLive,
  } = useTelemetryContext();

  // Fetch sensor list on mount + poll while the page is open. /api/machines/sensors
  // is the only endpoint that returns the real SCADA sensor set (~156 entries
  // with FIT/LIT/AIT/MV/...); /api/telemetry/sensors returns the 5-field
  // pipeline-metadata view, which was the old (incorrect) source. Polling keeps
  // the UI advancing while ETL→BFF WS deltas aren't wired — once they are, this
  // becomes a lightweight resync against the BFF's Redis cache.
  useEffect(() => {
    let cancelled = false;

    const fetchSensors = async () => {
      try {
        const response = await api.get<MachineSensorsResponse>('/api/machines/sensors');
        if (cancelled) return;

        // Deduplicate; sensors that resolve to a JSON-survey tag go to apiByTag
        // (process-associated). Sensors with no tag resolution are TB-only and
        // belong in the "Other sensors" folder.
        const seen = new Set<string>();
        const apiByTag = new Map<string, MachineSensorData>();
        const unmatchedApiSensors: MachineSensorData[] = [];
        for (const sensor of response.sensors) {
          if (seen.has(sensor.key) || sensor.key === 'timestamp') continue;
          seen.add(sensor.key);

          const displayName = mapToDisplayName(sensor.key);
          const range = displayName ? getSensorRange(displayName) : undefined;

          const entry: MachineSensorData = {
            key: sensor.key,
            name: sensor.name,
            device_id: sensor.device_id,
            device_name: sensor.device_name,
            value: sensor.value,
            timestamp: sensor.timestamp,
            unit: range?.unit || sensor.unit,
          };
          if (displayName) {
            apiByTag.set(displayName, entry);
          } else {
            unmatchedApiSensors.push(entry);
          }
        }

        // Seed configured (process-associated) sensors from JSON survey config,
        // populate values from API where available.
        const configuredTags = getConfiguredTags();
        const configuredSensors: MachineSensorData[] = configuredTags.map((tag) => {
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

        // Append TB sensors that don't map to any process (ProcessMachinePanel
        // groups these under "Other sensors" via the unassigned bucket).
        const fullSensors: MachineSensorData[] = [...configuredSensors, ...unmatchedApiSensors];

        setSensors(fullSensors);
        setError(null);

        if (!initializedRef.current && fullSensors.length > 0) {
          initializedRef.current = true;
          const allKeys = fullSensors.map((s) => s.key);
          const availableKeys = fullSensors.filter((s) => s.value != null).map((s) => s.key);
          const validFavorites = availableKeys.filter((k) => isFavorite(k));

          let initial: string[];
          if (incomingSensor && allKeys.includes(incomingSensor)) {
            // Deep-link wins: pin requested sensor first, layer favorites on top.
            initial = [incomingSensor, ...validFavorites.filter((k) => k !== incomingSensor)];
            // Drop the query param so a manual reload doesn't re-pin the same
            // sensor after the user has navigated away from it.
            setSearchParams({}, { replace: true });
          } else if (validFavorites.length > 0) {
            initial = validFavorites;
          } else {
            initial = availableKeys.slice(0, 3);
          }
          setSelectedSensorKeys(initial);
        }

        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        console.error('Error fetching variable sensors:', err);
        setError(t('loadVariableSensorsError'));
        setLoading(false);
      }
    };

    fetchSensors();
    const interval = setInterval(fetchSensors, SENSORS_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- isFavorite / incomingSensor / setSearchParams are read once at init (guarded by initializedRef) and must not retrigger the fetch
  }, [mapToDisplayName, getSensorMapping, getSensorRange, getConfiguredTags, t]);

  // Update sensor values from TelemetryContext
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

  useWidgetSync(selectedSensorKeys, widgets, setWidgets);

  const handleSensorToggle = (sensorKey: string) => {
    setSelectedSensorKeys((prev) =>
      prev.includes(sensorKey) ? prev.filter((k) => k !== sensorKey) : [...prev, sensorKey]
    );
  };

  const dndSensors = useDndSensors();

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (over && active.id !== over.id) {
        const oldIndex = widgets.findIndex((w) => w.id === active.id);
        const newIndex = widgets.findIndex((w) => w.id === over.id);
        if (oldIndex !== -1 && newIndex !== -1) {
          reorderWidgets(oldIndex, newIndex);
        }
      }
    },
    [widgets, reorderWidgets],
  );

  if (loading && sensors.length === 0) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <div className="text-center text-[var(--text-secondary)]">
          {t('loadingVariableSensors')}
        </div>
      </div>
    );
  }

  if (!loading && sensors.length === 0) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <div className="text-center text-[var(--text-secondary)]">
          <p className="mb-2">{t('noVariableSensors')}</p>
          <p className="text-sm">{t('verifyThingsBoard')}</p>
        </div>
      </div>
    );
  }

  const widgetIds = widgets.map((w) => w.id);

  return (
    <div className="flex gap-6 h-[calc(100vh-8rem)]">
      {/* Left panel */}
      <div className="w-80 shrink-0">
        <ProcessMachinePanel
          sensors={sensors}
          selectedSensorKeys={selectedSensorKeys}
          onSensorToggle={handleSensorToggle}
          showStatusHeader={true}
          variant="normal"
          headerTitle={t('variableSensors')}
          favoritesKey={FAVORITES_STORAGE_KEY}
          showAIMetadata={false}
        />
      </div>

      {/* Main content - charts with DnD */}
      <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin">
        {loading && (
          <div className="text-center text-[var(--text-secondary)] py-4">
            {t('loadingThingsBoard')}
          </div>
        )}

        {error && (
          <div className="text-center text-[var(--status-critical)] py-4">{error}</div>
        )}

        {!loading && selectedSensorKeys.length === 0 ? (
          <div className="flex items-center justify-center h-full text-[var(--text-secondary)]">
            {t('selectSensorsFromPanel')}
          </div>
        ) : (
          <DndContext
            sensors={dndSensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={widgetIds} strategy={verticalListSortingStrategy}>
              <div className="grid grid-cols-2 gap-4">
                {widgets.map((widget) => {
                  const sensor = sensors.find((s) => s.key === widget.id);
                  if (!sensor) return null;

                  const displayName = mapToDisplayName(widget.id);
                  const range = displayName ? getSensorRange(displayName) : undefined;
                  const chartNormalRange = (range?.min != null && range?.max != null)
                    ? { min: range.min, max: range.max }
                    : undefined;

                  return (
                    <PageWidgetWrapper
                      key={widget.id}
                      id={widget.id}
                      size={widget.size}
                      editMode={editMode}
                      canResize={true}
                      onResize={setWidgetSize}
                      onRemove={(id) => {
                        removeWidget(id);
                        setSelectedSensorKeys((prev) => prev.filter((k) => k !== id));
                      }}
                    >
                      <ErrorBoundary level="section">
                        <AreaBandChart
                          sensorName={displayName ? getDisplayLabel(displayName) : sensor.name}
                          tbKey={widget.id}
                          displayTag={displayName}
                          unit={sensor.unit}
                          normalRange={chartNormalRange}
                          isLive={isLive}
                        />
                      </ErrorBoundary>
                    </PageWidgetWrapper>
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}
