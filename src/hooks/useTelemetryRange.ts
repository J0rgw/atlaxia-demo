/**
 * useTelemetryRange — unified data source for time-series charts.
 *
 * Maps a range key ('1m' | ... | '30d') to either a REALTIME slice of the
 * in-memory WS buffer or a HISTORIC fetch against `/api/telemetry/history`
 * with a mode-specific bucket interval (LOD ladder, B15.2). Both modes also
 * merge a WS live tail past the last fetched point so the right edge of the
 * chart stays current without re-fetching.
 *
 * REALTIME ranges (1m, 5m) additionally fetch a one-shot backbone from
 * `/api/telemetry/history` snapped to a 30s bucket. Without it the WS-only
 * buffer (a `useRef` in TelemetryContext) is wiped on every page reload and
 * the chart paints empty until new WS frames trickle in (~1 s/point).
 *
 * Bucket sizes are chosen to stay under ThingsBoard's 1000-row hard cap:
 *   24h / 15m bucket = 96 points
 *   7d  / 1h bucket  = 168 points
 *   30d / 4h bucket  = 180 points
 *
 * The hook canonicalizes its WS-buffer lookup via TelemetryContext.getHistoryKey
 * (B15.5), so callers can pass the raw TB attribute key they already have on
 * `MachineSensorData.key` without worrying about display-tag resolution.
 */

import { useEffect, useMemo, useState } from 'react';
import type { QueryClient } from '@tanstack/react-query';
import { useTelemetryHistory, prefetchTelemetryHistory } from './useOverviewData';
import { useTelemetryContext } from '@/contexts/TelemetryContext';
import type { MachineTelemetryValue } from '@/types';

export type TelemetryRange = '1m' | '5m' | '15m' | '1h' | '5h' | '24h' | '7d' | '30d';
export type TelemetryMode = 'realtime' | 'historic';

interface RangeSpec {
  windowMs: number;
  mode: TelemetryMode;
  aggregation: 'NONE' | 'AVG';
  // ms; 0 means the WS path serves this range (interval not used)
  interval: number;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export const RANGE_SPECS: Readonly<Record<TelemetryRange, RangeSpec>> = {
  '1m':  { windowMs: 1 * MINUTE,   mode: 'realtime', aggregation: 'NONE', interval: 0 },
  '5m':  { windowMs: 5 * MINUTE,   mode: 'realtime', aggregation: 'NONE', interval: 0 },
  '15m': { windowMs: 15 * MINUTE,  mode: 'historic', aggregation: 'NONE', interval: 0 },
  '1h':  { windowMs: 1 * HOUR,     mode: 'historic', aggregation: 'AVG',  interval: 1 * MINUTE },
  '5h':  { windowMs: 5 * HOUR,     mode: 'historic', aggregation: 'AVG',  interval: 5 * MINUTE },
  '24h': { windowMs: 24 * HOUR,    mode: 'historic', aggregation: 'AVG',  interval: 15 * MINUTE },
  '7d':  { windowMs: 7 * DAY,      mode: 'historic', aggregation: 'AVG',  interval: 1 * HOUR },
  '30d': { windowMs: 30 * DAY,     mode: 'historic', aggregation: 'AVG',  interval: 4 * HOUR },
};

/**
 * Snap `now` down to the bucket boundary so TanStack's queryKey stays stable
 * within a bucket. Without this the queryKey is recomputed every render and
 * the cache thrashes (P11). For boundary <= 0 we still fall back to a 1-
 * second snap so the math never divides by zero, but real call sites should
 * pass a positive boundary via `queryBucketMs(spec)`.
 */
export function snapToBucket(now: number, intervalMs: number): number {
  const boundary = intervalMs > 0 ? intervalMs : 1000;
  return Math.floor(now / boundary) * boundary;
}

/**
 * Bucket size to snap startTs/endTs to before they enter a TanStack queryKey.
 * Without this, the raw HISTORIC '15m' range (interval=0) would advance the
 * timestamps every 1s on each re-render and burst /history at 60 req/min.
 *
 *  - REALTIME: 1s. Query is gated off anyway, but the WS-slice cutoff uses
 *    the same snap and the realtime chart wants per-second freshness.
 *  - HISTORIC with a real bucket: the bucket itself. New buckets close at
 *    natural boundaries (e.g. 24h/15min refetches once per quarter-hour).
 *  - HISTORIC with NONE aggregation (raw 15m): 60s. The chart is still fed
 *    by the WS live tail between refetches, so a once-per-minute backbone
 *    refresh is plenty.
 */
export function queryBucketMs(spec: { mode: TelemetryMode; interval: number }): number {
  if (spec.mode === 'realtime') return 1_000;
  if (spec.interval > 0) return spec.interval;
  return 60_000;
}

export interface UseTelemetryRangeOptions {
  /** Raw ThingsBoard attribute key — sent to `/api/telemetry/history`. */
  tbKey: string;
  range: TelemetryRange;
  enabled?: boolean;
}

export interface UseTelemetryRangeResult {
  data: MachineTelemetryValue[];
  mode: TelemetryMode;
  isLoading: boolean;
  isStale: boolean;
  range: TelemetryRange;
  /** Wall-clock left edge of the visible window (snapped to bucket). */
  startTs: number;
  /** Wall-clock right edge of the visible window (snapped to bucket). */
  endTs: number;
  /** Render a visible gap when consecutive points are further apart than this. */
  gapThresholdMs: number;
}

/**
 * Compute the gap threshold for sentinel insertion. REALTIME (or raw 15m)
 * tolerates up to 8 s of silence — constant-value signals only get refreshed
 * by the 2 s watchdog poll, so any sub-8 s gap is jitter, not a real
 * disconnect. HISTORIC keeps the "two missing buckets" rule.
 */
export function gapThresholdFor(spec: { mode: TelemetryMode; interval: number }): number {
  if (spec.mode === 'realtime' || spec.interval === 0) return 8_000;
  return 2 * spec.interval;
}

/**
 * Warm the cache for the HISTORIC variant of a range. REALTIME ranges are
 * no-ops — they're served by the in-memory WS buffer and have no HTTP cost
 * to amortize. The startTs/endTs are computed the same way the hook does
 * (snap to bucket boundary), so the prefetched key matches the hook's
 * later lookup and the click renders instantly (B15.7).
 */
export function prefetchTelemetryRange(
  queryClient: QueryClient,
  tbKey: string,
  range: TelemetryRange,
): Promise<void> {
  const spec = RANGE_SPECS[range];
  if (spec.mode !== 'historic') return Promise.resolve();
  const endTs = snapToBucket(Date.now(), queryBucketMs(spec));
  const startTs = endTs - spec.windowMs;
  return prefetchTelemetryHistory(queryClient, [tbKey], startTs, endTs, {
    aggregation: spec.aggregation,
    interval: spec.interval || 1,
  });
}

export function useTelemetryRange({
  tbKey,
  range,
  enabled = true,
}: UseTelemetryRangeOptions): UseTelemetryRangeResult {
  const spec = RANGE_SPECS[range];
  const { sensorHistory, getHistoryKey } = useTelemetryContext();

  // Canonical bucket key — matches what TelemetryContext writes (B15.5).
  const bucketKey = useMemo(() => getHistoryKey(tbKey), [getHistoryKey, tbKey]);

  // Snap to the query bucket boundary. The recomputation on each render
  // produces the same number until the boundary passes — TanStack sees a
  // strictly equal queryKey and the cache stays warm. Without snapping the
  // raw 15m range to 60s, every WS delta would shift the timestamps and the
  // /history + /inferences/history endpoints would refetch at ~1 Hz.
  const snapNow = snapToBucket(Date.now(), queryBucketMs(spec));
  const startTs = snapNow - spec.windowMs;
  const endTs = snapNow;

  // We always call useTelemetryHistory to respect Rules of Hooks; for
  // REALTIME ranges we pass an empty keys array so the underlying useQuery
  // stays disabled (gated by `enabled: keys.length > 0`).
  const historyQuery = useTelemetryHistory(
    spec.mode === 'historic' && enabled ? [tbKey] : [],
    startTs,
    endTs,
    {
      aggregation: spec.aggregation,
      // useTelemetryHistory hits `/history?interval=...`; pass at least 1 so
      // the BFF query string is well-formed even on the NONE-aggregation case.
      interval: spec.interval || 1,
    },
  );

  // REALTIME backfill: anchor endTs at mount time (Date.now()) instead of
  // snapping down to a wall-clock bucket. Snapping down could leave up to
  // a full bucket of "no backbone" between the last historic point and the
  // first WS frame after reload — visible as a gap on the chart. Anchoring
  // at Date.now() guarantees the first backbone reaches right up to the
  // moment of reload. We then re-anchor every 30s so the window keeps
  // sliding forward; in between, the queryKey is stable (no refetch storm)
  // and the WS live tail covers everything past the latest endTs.
  const REALTIME_BACKFILL_REFRESH_MS = 30_000;
  const [backfillEndTs, setBackfillEndTs] = useState<number>(() => Date.now());
  useEffect(() => {
    if (spec.mode !== 'realtime' || !enabled) return;
    const id = setInterval(
      () => setBackfillEndTs(Date.now()),
      REALTIME_BACKFILL_REFRESH_MS,
    );
    return () => clearInterval(id);
  }, [spec.mode, enabled]);
  const backfillStartTs = backfillEndTs - spec.windowMs;
  const realtimeBackfillQuery = useTelemetryHistory(
    spec.mode === 'realtime' && enabled ? [tbKey] : [],
    backfillStartTs,
    backfillEndTs,
    { aggregation: 'NONE', interval: 1 },
  );

  const gapThresholdMs = gapThresholdFor(spec);

  return useMemo<UseTelemetryRangeResult>(() => {
    const wsBuffer = sensorHistory[bucketKey] ?? [];

    if (spec.mode === 'realtime') {
      const cutoff = snapNow - spec.windowMs;

      // Backbone: REST-fetched points still inside the visible window. On a
      // fresh page reload this is the only data on the chart until the first
      // WS frame lands; without it the chart would paint empty.
      const backfillRaw = realtimeBackfillQuery.data?.data?.[tbKey] ?? [];
      const backfillPoints: MachineTelemetryValue[] = [];
      for (const p of backfillRaw) {
        const v = parseFloat(p.value);
        if (Number.isFinite(v) && p.ts >= cutoff) {
          backfillPoints.push({ ts: p.ts, value: v });
        }
      }

      // Live tail: WS frames past the last backbone point (or past the
      // window's left edge when the backbone is empty / still loading).
      const tailCutoff =
        backfillPoints.length > 0
          ? backfillPoints[backfillPoints.length - 1].ts
          : cutoff - 1;
      const liveTail = wsBuffer
        .filter((p) => p.ts > tailCutoff && p.ts >= cutoff)
        .map((p) => ({ ts: p.ts, value: p.value }));

      return {
        data: [...backfillPoints, ...liveTail],
        mode: 'realtime',
        isLoading: realtimeBackfillQuery.isLoading,
        isStale: realtimeBackfillQuery.isStale,
        range,
        startTs,
        endTs,
        gapThresholdMs,
      };
    }

    const historicPoints = historyQuery.data?.data?.[tbKey] ?? [];
    const historicData: MachineTelemetryValue[] = [];
    for (const p of historicPoints) {
      const v = parseFloat(p.value);
      if (Number.isFinite(v)) historicData.push({ ts: p.ts, value: v });
    }

    // Live tail: any WS frame whose ts is past the last historic bucket. The
    // tail is inherently bounded by MAX_HISTORY_POINTS (B15.6 = 600).
    const tailCutoff =
      historicData.length > 0 ? historicData[historicData.length - 1].ts : endTs;
    const liveTail = wsBuffer
      .filter((p) => p.ts > tailCutoff)
      .map((p) => ({ ts: p.ts, value: p.value }));

    return {
      data: [...historicData, ...liveTail],
      mode: 'historic',
      isLoading: historyQuery.isLoading,
      isStale: historyQuery.isStale,
      range,
      startTs,
      endTs,
      gapThresholdMs,
    };
  }, [
    spec.mode,
    spec.windowMs,
    sensorHistory,
    bucketKey,
    historyQuery.data,
    historyQuery.isLoading,
    historyQuery.isStale,
    realtimeBackfillQuery.data,
    realtimeBackfillQuery.isLoading,
    realtimeBackfillQuery.isStale,
    tbKey,
    snapNow,
    startTs,
    endTs,
    gapThresholdMs,
    range,
  ]);
}
