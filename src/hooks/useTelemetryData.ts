import { useMemo } from 'react';
import type { MachineTelemetryValue } from '@/types';

/**
 * Converts sensorHistory from TelemetryContext into the { key: MachineTelemetryValue[] }
 * format expected by chart components.
 */
export function useTelemetryData(
  sensorHistory: Record<string, Array<{ ts: number; value: number }>>
): Record<string, MachineTelemetryValue[]> {
  return useMemo(() => {
    const result: Record<string, MachineTelemetryValue[]> = {};
    Object.entries(sensorHistory).forEach(([key, history]) => {
      result[key] = history.map((h) => ({ ts: h.ts, value: h.value }));
    });
    return result;
  }, [sensorHistory]);
}
