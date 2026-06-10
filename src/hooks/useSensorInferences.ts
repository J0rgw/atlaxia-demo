/**
 * useSensorInferences — per-sensor in-session inference markers.
 *
 * Reads the rolling buffer of WS inference messages from TelemetryContext
 * and projects them to a flat list of events relevant to the given
 * sensor's process area. Drives the chart's markPoint layer (B15.4).
 *
 * Today the inference pipeline only publishes plant + per_process + per-
 * device rollups; per-sensor anomaly scores are tracked as the B17
 * cross-team follow-up. Until that lands, this hook surfaces a sensor's
 * process-level event (LOW+) — the granularity the model actually emits.
 */

import { useMemo } from 'react';
import { useTelemetryContext } from '@/contexts/TelemetryContext';
import { useSensorsConfig } from '@/hooks/useSensorsConfig';
import type { LevelName } from '@/types/inference';

export interface SensorInferenceEvent {
  ts: number;
  level: number;
  levelName: LevelName;
  modelName: string;
  processId: string;
  /** AI-predicted value at `ts` for this sensor (the "should-be" baseline). */
  predictedValue?: number;
  /** Sensor's actual reading at `ts`, when the publisher includes it. */
  actualValue?: number;
}

// Threshold below which we don't emit a marker. 1 = INFO (informational, no
// anomaly indicated); 2 = LOW and above means the model flagged a deviation.
const MIN_LEVEL = 2;

export function useSensorInferences(
  displayTag: string | undefined,
): SensorInferenceEvent[] {
  const { inferenceLog } = useTelemetryContext();
  const { categories } = useSensorsConfig();

  // Resolve which process area owns this sensor; if it isn't configured
  // we can't surface a marker (B17 will add a per-sensor fallback).
  const processId = useMemo(() => {
    if (!displayTag) return undefined;
    return categories.find((c) => c.sensors.includes(displayTag))?.id;
  }, [displayTag, categories]);

  return useMemo<SensorInferenceEvent[]>(() => {
    if (!displayTag || inferenceLog.length === 0) return [];
    const events: SensorInferenceEvent[] = [];
    for (const msg of inferenceLog) {
      const ts = Date.parse(msg.inference_ts);
      if (!Number.isFinite(ts)) continue;
      // Prefer a per-sensor prediction (richest signal — gives the chart a
      // concrete y to anchor the red dot to). Otherwise fall back to the
      // process-level severity pin.
      const pred = msg.predictions?.[displayTag];
      if (pred) {
        events.push({
          ts,
          level: 4,
          levelName: 'HIGH',
          modelName: msg.model_name,
          processId: processId ?? '',
          predictedValue: pred.predicted,
          actualValue: pred.actual,
        });
        continue;
      }
      if (!processId) continue;
      const layer = msg.per_process?.[processId];
      if (!layer || layer.level < MIN_LEVEL) continue;
      events.push({
        ts,
        level: layer.level,
        levelName: layer.level_name,
        modelName: msg.model_name,
        processId,
      });
    }
    return events;
  }, [displayTag, processId, inferenceLog]);
}
