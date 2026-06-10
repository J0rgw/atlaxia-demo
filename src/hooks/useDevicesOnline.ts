import { useMemo } from 'react';
import { useTelemetryContext } from '@/contexts/TelemetryContext';
import { useSensorsConfig } from '@/hooks/useSensorsConfig';

export type DevicesOnlineStatus = 'idle' | 'ready';

export interface DevicesOnlineResult {
  status: DevicesOnlineStatus;
  online: number;
  total: number;
  /** Age (ms) of the oldest sensor that still counts as online. */
  oldestOnlineAgeMs: number | null;
}

/**
 * Default freshness threshold for considering a sensor "online". 60s gives
 * room for the watchdog poll (2s) plus brief network hiccups while still
 * reflecting a real disconnect within a minute.
 */
export const DEFAULT_FRESHNESS_WINDOW_MS = 60_000;

/**
 * Counts ThingsBoard-backed sensors that have published a value within the
 * freshness window. Total = configured tags (the 77 SWaT devices). Online =
 * sensors whose last bucket_ts ≤ now - threshold.
 *
 * This is the ground-truth source for the Overview "Dispositivos en línea"
 * KPI card — the legacy /api/network/devices counts the cyber-side devices
 * (PLCs, switches), which is a different fleet.
 */
export function useDevicesOnline(
  freshnessWindowMs: number = DEFAULT_FRESHNESS_WINDOW_MS,
): DevicesOnlineResult {
  const { sensorLastTs } = useTelemetryContext();
  const { getConfiguredTags } = useSensorsConfig();

  return useMemo<DevicesOnlineResult>(() => {
    const tags = getConfiguredTags();
    const total = tags.length;
    const now = Date.now();
    const cutoff = now - freshnessWindowMs;

    let online = 0;
    let oldestOnlineTs: number | null = null;
    for (const tag of tags) {
      const ts = sensorLastTs[tag];
      if (typeof ts === 'number' && ts >= cutoff) {
        online += 1;
        if (oldestOnlineTs === null || ts < oldestOnlineTs) {
          oldestOnlineTs = ts;
        }
      }
    }

    // 'idle' until the first snapshot arrives for any configured sensor; once
    // a single timestamp is recorded we have a real measurement (even if
    // online === 0, that's a meaningful "everything offline" reading).
    const anyTimestamp = Object.keys(sensorLastTs).length > 0;
    const status: DevicesOnlineStatus = anyTimestamp ? 'ready' : 'idle';

    return {
      status,
      online,
      total,
      oldestOnlineAgeMs: oldestOnlineTs !== null ? now - oldestOnlineTs : null,
    };
  }, [sensorLastTs, getConfiguredTags, freshnessWindowMs]);
}
