/**
 * useOverviewData Hooks
 * React Query hooks for fetching overview dashboard data from real API endpoints.
 */

import { useQuery, type QueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// --- Control Indicators ---

interface ControlIndicatorsData {
  calidad: number;
  caudal: number;
  ciberseguridad: number;
  factorHumano: number;
  temperatura: number;
}

interface ControlIndicatorsResponse {
  indicators: ControlIndicatorsData;
  timestamp: number;
  status: string;
}

export function useControlIndicators(refetchInterval: number | false = 15000) {
  return useQuery({
    queryKey: ['control', 'indicators'],
    queryFn: () => api.get<ControlIndicatorsResponse>('/api/control/indicators'),
    refetchInterval,
  });
}

// --- Active Alarms (ISA-18.2) ---

export interface ActiveAlarm {
  sensor_tag: string;
  level: string;
  priority: string;
  value: number;
  limit: number;
  timestamp: number;
  acknowledged: boolean;
  description: string;
  process_area: string;
  suggested_action: string;
}

interface ActiveAlarmsResponse {
  alarms: ActiveAlarm[];
  timestamp: number;
  total_alarms: number;
  by_priority: Record<string, number>;
  by_process: Record<string, number>;
}

export function useActiveAlarms(refetchInterval: number | false = 10000) {
  return useQuery({
    queryKey: ['sensors', 'alarms'],
    queryFn: () => api.get<ActiveAlarmsResponse>('/api/sensors/alarms'),
    refetchInterval,
    retry: 2,
  });
}

// --- Anomalies ---

interface AnomalyItem {
  sensorKey: string;
  sensorName: string;
  category: string;
  currentValue: number;
  behaviorSeparation: number;
  anomalyIndicator: number;
  isAnomaly: boolean;
}

interface AnomalyResponse {
  anomalies: AnomalyItem[];
  totalSensors: number;
  anomalyCount: number;
  threshold: number;
  timestamp: number;
}

export function useAnomalies(threshold = 0.7, refetchInterval: number | false = 30000) {
  return useQuery({
    queryKey: ['anomalies', threshold],
    queryFn: () =>
      api.get<AnomalyResponse>(`/api/anomalies?threshold=${threshold}`),
    refetchInterval,
    retry: 2,
  });
}

/**
 * Calendar-specific anomalies hook. Differs from useAnomalies in three ways:
 *
 * 1. `refetchOnMount: 'always'` — guarantees a refetch every time the Overview
 *    page remounts (e.g. after navigating from Telemetry back to Overview),
 *    instead of waiting up to 30 s for the next refetchInterval to fire.
 * 2. `placeholderData` keeps the previous response visible while refetching,
 *    so the calendar never flashes empty on remount or threshold change.
 * 3. Independent query key (`['anomalies', 'calendar', ...]`) so unrelated
 *    consumers can't evict or invalidate the calendar's data.
 *
 * Root cause of the original bug: shared `['anomalies', threshold]` key with
 * AnomaliesPage + telemetry-page side-effects could evict the cache between
 * mounts, leaving the calendar to render an empty grid until the next
 * 30 s poll completed.
 */
export function useCalendarAnomalies(threshold = 0.7, refetchInterval: number | false = 30000) {
  return useQuery({
    queryKey: ['anomalies', 'calendar', threshold],
    queryFn: () =>
      api.get<AnomalyResponse>(`/api/anomalies?threshold=${threshold}`),
    refetchInterval,
    retry: 2,
    refetchOnMount: 'always',
    refetchOnReconnect: true,
    refetchOnWindowFocus: false,
    staleTime: 15_000,
    gcTime: 5 * 60_000,
    placeholderData: (prev) => prev,
  });
}

// --- Process Status ---

interface ProcessAreaStatus {
  id: string;
  name: string;
  status: string;
  active_alarms: ActiveAlarm[];
  sensor_count: number;
  sensors_in_alarm: number;
}

interface ProcessAreasStatusResponse {
  process_areas: ProcessAreaStatus[];
  overall_status: string;
  total_alarms: number;
  timestamp: number;
}

export function useProcessStatus() {
  return useQuery({
    queryKey: ['sensors', 'process-status'],
    queryFn: () =>
      api.get<ProcessAreasStatusResponse>('/api/sensors/process-status'),
    refetchInterval: 15000,
    retry: 2,
  });
}

// --- Telemetry History ---

interface TelemetryHistoryPoint {
  ts: number;
  value: string;
}

interface TelemetryHistoryResponse {
  data: Record<string, TelemetryHistoryPoint[]>;
  startTs: number;
  endTs: number;
}

interface TelemetryHistoryOptions {
  aggregation?: 'NONE' | 'AVG' | 'MIN' | 'MAX';
  interval?: number;
}

/**
 * Build the queryKey/queryFn pair used by useTelemetryHistory. Extracted so
 * the prefetcher (B15.7) can mirror the exact identity without duplicating
 * the URL composition.
 */
function telemetryHistoryQueryConfig(
  keys: string[],
  startTs: number,
  endTs: number,
  aggregation: 'NONE' | 'AVG' | 'MIN' | 'MAX',
  interval: number,
) {
  const params = new URLSearchParams();
  params.set('keys', keys.join(','));
  params.set('startTs', String(startTs));
  params.set('endTs', String(endTs));
  params.set('aggregation', aggregation);
  params.set('interval', String(interval));
  return {
    queryKey: ['telemetry', 'history', keys.join(','), startTs, endTs, aggregation, interval] as const,
    queryFn: () =>
      api.get<TelemetryHistoryResponse>(`/api/telemetry/history?${params.toString()}`),
  };
}

export function useTelemetryHistory(
  keys: string[],
  startTs: number,
  endTs: number,
  opts: TelemetryHistoryOptions = {},
) {
  const { aggregation = 'AVG', interval = 60000 } = opts;
  const cfg = telemetryHistoryQueryConfig(keys, startTs, endTs, aggregation, interval);

  return useQuery({
    queryKey: cfg.queryKey,
    queryFn: cfg.queryFn,
    refetchInterval: 60000,
    refetchOnWindowFocus: false,
    enabled: keys.length > 0,
    retry: 2,
  });
}

/**
 * Warm the TanStack cache for the same shape useTelemetryHistory would
 * request. Fire-and-forget; TanStack dedupes by queryKey and respects
 * staleTime, so spamming on hover is safe (B15.7).
 */
export function prefetchTelemetryHistory(
  queryClient: QueryClient,
  keys: string[],
  startTs: number,
  endTs: number,
  opts: TelemetryHistoryOptions = {},
): Promise<void> {
  if (keys.length === 0) return Promise.resolve();
  const { aggregation = 'AVG', interval = 60000 } = opts;
  const cfg = telemetryHistoryQueryConfig(keys, startTs, endTs, aggregation, interval);
  return queryClient.prefetchQuery({
    queryKey: cfg.queryKey,
    queryFn: cfg.queryFn,
    staleTime: 30_000,
  });
}
