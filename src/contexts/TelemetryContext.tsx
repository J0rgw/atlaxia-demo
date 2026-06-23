/**
 * TelemetryContext - Global provider for real-time sensor data.
 *
 * Features:
 * - Real-time WebSocket updates with HTTP polling fallback
 * - Connection status tracking
 * - Data freshness indicator
 * - Sensor value history for trends
 * - Config-driven sensor mapping (supports multi-client installations)
 */

import React, { createContext, useContext, useCallback, useMemo, useRef, useState, useEffect } from 'react';
import {
  useTelemetryWebSocket,
  type ConnectionStatus,
  type TelemetrySnapshot,
  type TelemetryDelta,
  type NetworkAlertWS,
} from '@/hooks/useTelemetryWebSocket';
import type { InferenceMessage } from '@/types/inference';
import { useInferenceLatest } from '@/hooks/useInference';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { useInstallationStore } from '@/stores/installationStore';
import type { SensorsConfig, SensorMapping } from '@/types/installation';
import {
  SENSOR_REVERSE_MAPPING,
  SENSOR_MAPPING,
} from '@/config/sensors';
import { INDUSTRIAL_SENSORS, PROCESS_AREAS } from '@/config/industrial-sensors';

export type DataFreshness = 'live' | 'recent' | 'stale' | 'no-data';

interface SensorHistory {
  ts: number;
  value: number;
}

interface TelemetryContextValue {
  // Raw sensor values from ThingsBoard keys
  rawSensorValues: Record<string, number>;
  // Mapped sensor values (display names as keys)
  sensorValues: Record<string, number>;
  // Sensor value history for charts/sparklines
  sensorHistory: Record<string, SensorHistory[]>;
  // Connection status
  connectionStatus: ConnectionStatus;
  // Data freshness
  dataFreshness: DataFreshness;
  // Timestamp of last update
  lastUpdateTime: number | null;
  // Time since last update in seconds
  secondsSinceUpdate: number | null;
  // Is receiving real-time data
  isLive: boolean;
  // Force reconnect
  reconnect: () => void;
  // Get trend for a sensor (accepts any caller-known key; resolves canonically)
  getSensorTrend: (key: string) => { trend: 'up' | 'down' | 'stable'; percent: number };
  // Map a raw key to display name (config-driven)
  mapToDisplayName: (rawKey: string) => string | undefined;
  // Canonical key used for sensorHistory / getSensorTrend lookups. Returns the
  // display tag for mapped sensors and `tb:<rawKey>` for unmapped TB-only
  // sensors, so writers (handleSnapshot/handleDelta) and readers
  // (VariablesPage, MachinesPage) always hit the same bucket.
  getHistoryKey: (rawKey: string) => string;
  // Check if a sensor is configured
  isSensorConfigured: (tag: string) => boolean;
  // Last-arrival timestamp (ms since epoch) per display-name sensor key. Used by
  // useDevicesOnline to compute "online" via freshness window — the source of
  // truth for the Overview "Dispositivos en línea" card.
  sensorLastTs: Record<string, number>;
  // Latest inference message per model (BFF v2.1). Snapshot inicial + broadcasts.
  latestInferenceByModel: Record<string, InferenceMessage>;
  // Rolling buffer of in-session inference messages (capped, ordered oldest→newest).
  // Drives the per-sensor markPoint layer of the chart (B15.4); plant-level
  // HISTORIC markers go through the separate /api/inferences/history endpoint.
  inferenceLog: InferenceMessage[];
}

const TelemetryContext = createContext<TelemetryContextValue | null>(null);

const MAX_HISTORY_POINTS = 600; // 10 minutes at 1 Hz — sized for the REALTIME 5m range (B15) with headroom
const STALE_THRESHOLD_MS = 30000; // 30 seconds
// In-session inference ring buffer cap. 200 entries comfortably covers a
// multi-model deployment with a few minutes of headroom; the chart filters
// down to events whose process matches the rendered sensor (B15.4).
const MAX_INFERENCE_LOG_ENTRIES = 200;

// Stable reference required by useTelemetryWebSocket: an inline literal would
// create a new array each render and refire the resubscribe effect.
const WS_CHANNELS: string[] = ['telemetry', 'network_alerts', 'inferences'];

// The polling service broadcasts WS keys as `${device_name}.${attribute}`
// (see src/back/src/services/polling.py), while the HTTP API returns the
// bare attribute. Pages look up rawSensorValues/sensorHistory by the API
// sensor.key, so without normalization here the lookup always misses and
// the /telemetry charts render empty even while the WS is live.
function normalizeWsKey(rawKey: string): string {
  const dotIndex = rawKey.indexOf('.');
  return dotIndex > 0 ? rawKey.substring(dotIndex + 1) : rawKey;
}

interface TelemetryProviderProps {
  children: React.ReactNode;
  enabled?: boolean;
}

/**
 * Build default sensors config from hardcoded SWAT files.
 */
function buildDefaultSensorsConfig(): SensorsConfig {
  const mapping: Record<string, SensorMapping> = {};

  for (const [tag, sensor] of Object.entries(INDUSTRIAL_SENSORS)) {
    mapping[tag] = {
      thingsboard_key: sensor.thingsboardKey || SENSOR_MAPPING[tag] || tag,
      display_name: sensor.description.short,
      unit: sensor.engineering.unit,
      min: sensor.operatingLimits.normal.min,
      max: sensor.operatingLimits.normal.max,
    };
  }

  const categories = Object.values(PROCESS_AREAS).map((area) => ({
    id: area.id,
    name: area.fullName,
    expanded: area.id === 'P1',
    sensors: area.sensors,
  }));

  return {
    categories,
    mapping,
    defaultSelected: ['LIT101', 'FIT101', 'AIT201'],
  };
}

let cachedDefaultConfig: SensorsConfig | null = null;

function getDefaultConfig(): SensorsConfig {
  if (!cachedDefaultConfig) {
    cachedDefaultConfig = buildDefaultSensorsConfig();
  }
  return cachedDefaultConfig;
}

export function TelemetryProvider({ children, enabled = true }: TelemetryProviderProps) {
  const [rawSensorValues, setRawSensorValues] = useState<Record<string, number>>({});
  const [sensorValues, setSensorValues] = useState<Record<string, number>>({});
  const [secondsSinceUpdate, setSecondsSinceUpdate] = useState<number | null>(null);
  // Timestamp of the last successful watchdog poll (/api/machines/snapshot).
  // The WS `telemetry` channel only carries deltas when the ETL→BFF publisher
  // is on; while it is off (audit-B17) the poll is the live data source, so
  // dataFreshness must count it too — otherwise it reads `stale` forever.
  const [lastPollTime, setLastPollTime] = useState<number | null>(null);
  const historyRef = useRef<Record<string, SensorHistory[]>>({});
  const [historyTrigger, setHistoryTrigger] = useState(0);
  // Tracks the last-known timestamp per display-name sensor key. Lives in a
  // ref to avoid re-rendering every consumer on every delta; `historyTrigger`
  // already serves as the change beacon.
  const sensorLastTsRef = useRef<Record<string, number>>({});
  const [latestInferenceByModel, setLatestInferenceByModel] = useState<
    Record<string, InferenceMessage>
  >({});
  const inferenceLogRef = useRef<InferenceMessage[]>([]);
  const [inferenceLogTrigger, setInferenceLogTrigger] = useState(0);

  // Get installation config from store
  const installationConfig = useInstallationStore((state) => state.config);

  // Get the active sensors config (installation or defaults)
  const sensorsConfig = useMemo<SensorsConfig>(() => {
    const cfg = installationConfig?.sensors_config;
    if (cfg && typeof cfg === 'object' && Object.keys(cfg.mapping || {}).length > 0) {
      return cfg as SensorsConfig;
    }
    return getDefaultConfig();
  }, [installationConfig?.sensors_config]);

  // Build reverse mapping: thingsboard_key -> display_name (tag)
  const reverseMapping = useMemo(() => {
    const map: Record<string, string> = {};
    for (const [tag, mapping] of Object.entries(sensorsConfig.mapping)) {
      if (mapping.thingsboard_key) {
        map[mapping.thingsboard_key] = tag;
      }
    }
    return map;
  }, [sensorsConfig.mapping]);

  // Map a raw ThingsBoard key to display name
  const mapToDisplayName = useCallback(
    (rawKey: string): string | undefined => {
      // Strip device prefix: "DeviceName.SensorKey" -> "SensorKey"
      let normalizedKey = rawKey;
      const dotIndex = rawKey.indexOf('.');
      if (dotIndex > 0) {
        normalizedKey = rawKey.substring(dotIndex + 1);
      }

      // Try direct lookup in reverse mapping
      let displayName = reverseMapping[normalizedKey];
      if (displayName) return displayName;

      // Try original key
      if (normalizedKey !== rawKey) {
        displayName = reverseMapping[rawKey];
        if (displayName) return displayName;
      }

      // Strip common suffixes and try again
      const suffixPatterns = [/_PV$/i, /_STATUS$/i, /_ALARM$/i, /_STATE$/i, /\.Value$/i, /\.Pv\.Value$/i];
      for (const pattern of suffixPatterns) {
        const stripped = normalizedKey.replace(pattern, '');
        if (stripped !== normalizedKey) {
          displayName = reverseMapping[stripped];
          if (displayName) return displayName;
        }
      }

      // Try pattern matching for ISA sensor names
      const patterns: Array<{ pattern: RegExp; prefix: string }> = [
        { pattern: /LIT(\d+)/i, prefix: 'LIT' },
        { pattern: /FIT(\d+)/i, prefix: 'FIT' },
        { pattern: /AIT(\d+)/i, prefix: 'AIT' },
        { pattern: /PIT(\d+)/i, prefix: 'PIT' },
        { pattern: /DPIT(\d+)/i, prefix: 'DPIT' },
        { pattern: /MV(\d+)/i, prefix: 'MV' },
        { pattern: /P(\d+)/i, prefix: 'P' },
        { pattern: /UV(\d+)/i, prefix: 'UV' },
      ];

      for (const { pattern, prefix } of patterns) {
        const match = normalizedKey.match(pattern);
        if (match) {
          const candidateTag = `${prefix}${match[1]}`;
          if (sensorsConfig.mapping[candidateTag]) {
            return candidateTag;
          }
        }
      }

      // Also try legacy SENSOR_REVERSE_MAPPING as fallback
      const legacyName = SENSOR_REVERSE_MAPPING[normalizedKey];
      if (legacyName && sensorsConfig.mapping[legacyName]) {
        return legacyName;
      }

      return undefined;
    },
    [reverseMapping, sensorsConfig.mapping]
  );

  // Check if a sensor tag is configured
  const isSensorConfigured = useCallback(
    (tag: string): boolean => {
      return tag in sensorsConfig.mapping;
    },
    [sensorsConfig.mapping]
  );

  // Canonical history-bucket key. Both writers and readers go through this.
  const getHistoryKey = useCallback(
    (rawKey: string): string => mapToDisplayName(rawKey) ?? `tb:${rawKey}`,
    [mapToDisplayName],
  );

  const handleSnapshot = useCallback((snapshot: TelemetrySnapshot, _source: string = 'ws-snapshot') => {
    // Drop late WS frames that arrive during/after logout — the provider is
    // about to unmount but its handlers can still race the auth flip.
    if (!useAuthStore.getState().isAuthenticated) return;
    try {
      if (!snapshot || typeof snapshot !== 'object' || typeof snapshot.sensors !== 'object') {
        console.warn('[TelemetryContext] Invalid snapshot structure, skipping:', snapshot);
        return;
      }

      const now = snapshot.timestamp || Date.now();

      // Filter out invalid sensor values before storing.
      // Reject null/undefined/'' BEFORE Number() — they coerce to 0 and
      // would otherwise plant a phantom point at the bottom of the chart on
      // first snapshot after a reload while the BFF cache is still cold.
      const validSensors: Record<string, number> = {};
      Object.entries(snapshot.sensors).forEach(([key, rawValue]) => {
        if (typeof key !== 'string') return;
        // Cast through unknown so the runtime guard remains live even though
        // the WS type promises `number` — late-arriving frames have been
        // observed with stringified nulls/empties.
        const value = rawValue as unknown;
        if (value === null || value === undefined || value === '') return;
        const numValue = typeof value === 'number' ? value : Number(value);
        if (!Number.isFinite(numValue)) {
          console.warn('[TelemetryContext] Invalid sensor value in snapshot, skipping:', key, value);
          return;
        }
        validSensors[normalizeWsKey(key)] = numValue;
      });

      setRawSensorValues(validSensors);

      // Map to display names using config
      const mappedValues: Record<string, number> = {};
      Object.entries(validSensors).forEach(([key, value]) => {
        const displayName = mapToDisplayName(key);
        if (displayName && isSensorConfigured(displayName)) {
          mappedValues[displayName] = value;
          sensorLastTsRef.current[displayName] = now;
        }
      });
      setSensorValues(mappedValues);

      // Update history for all sensors, bucketed by the canonical history key
      // so VariablesPage / MachinesPage can look up by the same key regardless
      // of whether the sensor has a display-tag mapping.
      Object.entries(validSensors).forEach(([key, value]) => {
        const historyKey = getHistoryKey(key);
        if (!historyRef.current[historyKey]) {
          historyRef.current[historyKey] = [];
        }
        const history = historyRef.current[historyKey];
        const lastPoint = history[history.length - 1];

        // Only add if value changed or enough time passed
        if (!lastPoint || now - lastPoint.ts >= 1000) {
          history.push({ ts: now, value });
          if (history.length > MAX_HISTORY_POINTS) {
            history.shift();
          }
        }
      });
      setHistoryTrigger((t) => t + 1);
    } catch (err) {
      console.error('[TelemetryContext] Error processing snapshot:', err);
    }
  }, [mapToDisplayName, isSensorConfigured, getHistoryKey]);

  const handleDelta = useCallback((delta: TelemetryDelta) => {
    if (!useAuthStore.getState().isAuthenticated) return;
    try {
      if (!delta || typeof delta !== 'object' || typeof delta.changes !== 'object') {
        console.warn('[TelemetryContext] Invalid delta structure, skipping:', delta);
        return;
      }

      const now = delta.timestamp || Date.now();

      // Filter out invalid values before applying delta (same null-aware
      // guard as the snapshot path — see handleSnapshot for rationale).
      const validChanges: Record<string, number> = {};
      Object.entries(delta.changes).forEach(([key, rawValue]) => {
        if (typeof key !== 'string') return;
        const value = rawValue as unknown;
        if (value === null || value === undefined || value === '') return;
        const numValue = typeof value === 'number' ? value : Number(value);
        if (!Number.isFinite(numValue)) {
          console.warn('[TelemetryContext] Invalid sensor value in delta, skipping:', key, value);
          return;
        }
        validChanges[normalizeWsKey(key)] = numValue;
      });

      if (Object.keys(validChanges).length === 0) return;

      setRawSensorValues((prev) => ({
        ...prev,
        ...validChanges,
      }));

      // Map changes to display names
      const mappedChanges: Record<string, number> = {};
      Object.entries(validChanges).forEach(([key, value]) => {
        const displayName = mapToDisplayName(key);
        if (displayName && isSensorConfigured(displayName)) {
          mappedChanges[displayName] = value;
          sensorLastTsRef.current[displayName] = now;
        }
      });

      if (Object.keys(mappedChanges).length > 0) {
        setSensorValues((prev) => ({
          ...prev,
          ...mappedChanges,
        }));
      }

      // Update history for changed sensors (1 s coalesce mirrors snapshot — without
      // it, bursty deltas saturate MAX_HISTORY_POINTS and thrash shift()).
      Object.entries(validChanges).forEach(([key, value]) => {
        const historyKey = getHistoryKey(key);
        if (!historyRef.current[historyKey]) {
          historyRef.current[historyKey] = [];
        }
        const history = historyRef.current[historyKey];
        const lastPoint = history[history.length - 1];
        if (!lastPoint || now - lastPoint.ts >= 1000) {
          history.push({ ts: now, value });
          if (history.length > MAX_HISTORY_POINTS) {
            history.shift();
          }
        }
      });
      setHistoryTrigger((t) => t + 1);
    } catch (err) {
      console.error('[TelemetryContext] Error processing delta:', err);
    }
  }, [mapToDisplayName, isSensorConfigured, getHistoryKey]);

  const addNotification = useNotificationStore((state) => state.addNotification);

  const handleInference = useCallback((msg: InferenceMessage) => {
    if (!useAuthStore.getState().isAuthenticated) return;
    if (!msg || typeof msg.model_name !== 'string') {
      console.warn('[TelemetryContext] Invalid inference message, skipping:', msg);
      return;
    }
    setLatestInferenceByModel((prev) => ({
      ...prev,
      [msg.model_name]: msg,
    }));
    // Append to the rolling buffer used by the chart's markPoint layer.
    // Dedupe on (model_name, inference_ts) so the REST bootstrap that pushes
    // through /api/inference/latest doesn't double-count with the WS feed.
    const last = inferenceLogRef.current[inferenceLogRef.current.length - 1];
    if (last?.model_name === msg.model_name && last?.inference_ts === msg.inference_ts) {
      return;
    }
    const next = [...inferenceLogRef.current, msg];
    if (next.length > MAX_INFERENCE_LOG_ENTRIES) {
      next.splice(0, next.length - MAX_INFERENCE_LOG_ENTRIES);
    }
    inferenceLogRef.current = next;
    setInferenceLogTrigger((n) => n + 1);
  }, []);

  const handleNetworkAlert = useCallback((alert: NetworkAlertWS) => {
    // Critical: addNotification writes to the persisted notificationStore,
    // so a late alert post-logout would leak into the next user's session.
    if (!useAuthStore.getState().isAuthenticated) return;
    const typeMap: Record<string, 'error' | 'warning' | 'info'> = {
      Emergencia: 'error',
      Alerta: 'warning',
      Aviso: 'info',
    };
    addNotification({
      id: `alert-${alert.id}-${Date.now()}`,
      type: typeMap[alert.alertType] || 'info',
      alertType: alert.alertType,
      name: alert.name,
      macOrigin: alert.macOrigin,
      ipOrigin: alert.ipOrigin,
      timestamp: alert.timestamp,
    });
  }, [addNotification]);

  const {
    status: connectionStatus,
    lastUpdate: wsLastUpdate,
    reconnect,
    isLive,
  } = useTelemetryWebSocket({
    channels: WS_CHANNELS,
    onSnapshot: handleSnapshot,
    onDelta: handleDelta,
    onNetworkAlert: handleNetworkAlert,
    onInference: handleInference,
    fallbackPollingMs: 10000,
    enabled,
  });

  // "Last update" is the most recent data arrival by ANY route: a WS
  // telemetry message OR a successful watchdog poll. Keying freshness off
  // the WS alone marks the data `stale` whenever the ETL→BFF telemetry
  // publisher is off, even though the poll keeps the values current.
  const lastUpdateTime = useMemo<number | null>(() => {
    const newest = Math.max(wsLastUpdate ?? 0, lastPollTime ?? 0);
    return newest > 0 ? newest : null;
  }, [wsLastUpdate, lastPollTime]);

  // Watchdog HTTP polling for the case where the WS is "connected" but ETL
  // isn't pushing deltas (the backend follow-up listed in B15.9). Without
  // this, the chart's REALTIME mode (which reads from sensorHistory) stays
  // empty even when /api/machines/sensors is returning live values to the
  // sensor cards. handleSnapshot's 1 s coalesce keeps the buffer healthy
  // even when a WS snapshot arrives at the same tick.
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const snapshot = await api.get<TelemetrySnapshot>('/api/machines/snapshot');
        if (cancelled) return;
        handleSnapshot(snapshot, 'watchdog-poll');
        setLastPollTime(Date.now());
      } catch (err) {
        if (cancelled) return;
        console.error('[TelemetryContext] Watchdog snapshot poll failed:', err);
      }
    };
    poll();
    const id = setInterval(poll, 2000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [enabled, handleSnapshot]);

  // REST bootstrap: pinta inmediatamente desde /api/inference/latest mientras
  // el WS levanta. Solo rellena modelos no presentes para no pisar broadcasts
  // que ya hayan llegado por el canal "inferences".
  const inferenceLatestQuery = useInferenceLatest();
  useEffect(() => {
    const models = inferenceLatestQuery.data?.models;
    if (!models) return;
    setLatestInferenceByModel((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const [modelName, msg] of Object.entries(models)) {
        if (!next[modelName]) {
          next[modelName] = msg;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [inferenceLatestQuery.data]);

  // Update seconds since last update
  useEffect(() => {
    if (lastUpdateTime === null) {
      setSecondsSinceUpdate(null);
      return;
    }

    const updateSeconds = () => {
      setSecondsSinceUpdate(Math.floor((Date.now() - lastUpdateTime) / 1000));
    };

    updateSeconds();
    const interval = setInterval(updateSeconds, 1000);
    return () => clearInterval(interval);
  }, [lastUpdateTime]);

  // Calculate data freshness
  const dataFreshness = useMemo<DataFreshness>(() => {
    if (lastUpdateTime === null || Object.keys(rawSensorValues).length === 0) {
      return 'no-data';
    }

    const age = Date.now() - lastUpdateTime;

    if (age < 5000) return 'live';
    if (age < STALE_THRESHOLD_MS) return 'recent';
    return 'stale';
  }, [lastUpdateTime, rawSensorValues]);

  // Get sensor history (memoized with trigger)
  const sensorHistory = useMemo(() => {
    // Access historyTrigger to trigger re-computation
    void historyTrigger;
    return { ...historyRef.current };
  }, [historyTrigger]);

  const inferenceLog = useMemo<InferenceMessage[]>(() => {
    void inferenceLogTrigger;
    return inferenceLogRef.current;
  }, [inferenceLogTrigger]);

  // Re-key off historyTrigger so consumers re-render whenever the ref mutates
  // (snapshot/delta paths bump the trigger at the end of their work).
  const sensorLastTs = useMemo<Record<string, number>>(() => {
    void historyTrigger;
    return { ...sensorLastTsRef.current };
  }, [historyTrigger]);

  // Calculate trend for a sensor. Callers pass whichever key they have
  // (raw API key, display tag, or already-canonical key); we resolve through
  // getHistoryKey so we always hit the right bucket.
  const getSensorTrend = useCallback(
    (key: string): { trend: 'up' | 'down' | 'stable'; percent: number } => {
      const history = historyRef.current[getHistoryKey(key)];
      if (!history || history.length < 2) {
        return { trend: 'stable', percent: 0 };
      }

      // Use last 10 points for trend calculation
      const recent = history.slice(-10);
      const first = recent[0].value;
      const last = recent[recent.length - 1].value;
      const diff = last - first;
      const percent = first !== 0 ? (diff / first) * 100 : 0;

      if (Math.abs(percent) < 1) {
        return { trend: 'stable', percent: 0 };
      }

      return {
        trend: percent > 0 ? 'up' : 'down',
        percent: Math.abs(percent),
      };
    },
    [getHistoryKey]
  );

  const value = useMemo<TelemetryContextValue>(
    () => ({
      rawSensorValues,
      sensorValues,
      sensorHistory,
      connectionStatus,
      dataFreshness,
      lastUpdateTime,
      secondsSinceUpdate,
      isLive,
      reconnect,
      getSensorTrend,
      mapToDisplayName,
      getHistoryKey,
      isSensorConfigured,
      sensorLastTs,
      latestInferenceByModel,
      inferenceLog,
    }),
    [
      rawSensorValues,
      sensorValues,
      sensorHistory,
      connectionStatus,
      dataFreshness,
      lastUpdateTime,
      secondsSinceUpdate,
      isLive,
      reconnect,
      getSensorTrend,
      mapToDisplayName,
      getHistoryKey,
      isSensorConfigured,
      sensorLastTs,
      latestInferenceByModel,
      inferenceLog,
    ]
  );

  return (
    <TelemetryContext.Provider value={value}>
      {children}
    </TelemetryContext.Provider>
  );
}

export function useTelemetryContext(): TelemetryContextValue {
  const context = useContext(TelemetryContext);
  if (!context) {
    throw new Error('useTelemetryContext must be used within a TelemetryProvider');
  }
  return context;
}

export default TelemetryContext;
