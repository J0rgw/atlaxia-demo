import { describe, it, expect, vi } from 'vitest';
import type { QueryClient } from '@tanstack/react-query';
import {
  snapToBucket,
  gapThresholdFor,
  queryBucketMs,
  prefetchTelemetryRange,
  RANGE_SPECS,
  type TelemetryRange,
} from './useTelemetryRange';

describe('snapToBucket', () => {
  it('snaps down to the bucket boundary', () => {
    const fifteenMin = 15 * 60_000;
    // Hour-aligned anchor: 2023-11-14T22:00:00Z
    const aligned = Math.floor(1_700_000_000_000 / (60 * 60_000)) * (60 * 60_000);
    expect(snapToBucket(aligned, fifteenMin)).toBe(aligned);
    expect(snapToBucket(aligned + 7_000, fifteenMin)).toBe(aligned);
    expect(snapToBucket(aligned + fifteenMin + 7_000, fifteenMin)).toBe(aligned + fifteenMin);
  });

  it('produces the same value for any ts inside the same bucket', () => {
    const hour = 60 * 60_000;
    const base = Math.floor(1_700_000_000_000 / hour) * hour; // hour-aligned
    const a = snapToBucket(base, hour);
    const b = snapToBucket(base + 17 * 60_000, hour);
    const c = snapToBucket(base + 59 * 60_000 + 999, hour);
    expect(a).toBe(b);
    expect(b).toBe(c);
  });

  it('advances when ts crosses the next boundary', () => {
    const hour = 60 * 60_000;
    const base = Math.floor(1_700_000_000_000 / hour) * hour;
    expect(snapToBucket(base, hour)).toBe(base);
    expect(snapToBucket(base + hour - 1, hour)).toBe(base);
    expect(snapToBucket(base + hour, hour)).toBe(base + hour);
  });

  it('keeps a 1-second floor for boundary <= 0 so the math never divides by zero', () => {
    const base = 1_700_000_000_000;
    expect(snapToBucket(base + 423, 0)).toBe(Math.floor((base + 423) / 1000) * 1000);
  });
});

describe('queryBucketMs', () => {
  it('returns 1s for REALTIME ranges (query is gated off; the snap drives the WS slice cutoff)', () => {
    expect(queryBucketMs(RANGE_SPECS['1m'])).toBe(1_000);
    expect(queryBucketMs(RANGE_SPECS['5m'])).toBe(1_000);
  });

  it('returns 60s for the raw 15m HISTORIC range so /history queryKey is stable per minute', () => {
    expect(queryBucketMs(RANGE_SPECS['15m'])).toBe(60_000);
  });

  it('returns the spec bucket for bucketed HISTORIC ranges', () => {
    expect(queryBucketMs(RANGE_SPECS['1h'])).toBe(60_000);
    expect(queryBucketMs(RANGE_SPECS['24h'])).toBe(15 * 60_000);
    expect(queryBucketMs(RANGE_SPECS['7d'])).toBe(60 * 60_000);
    expect(queryBucketMs(RANGE_SPECS['30d'])).toBe(4 * 60 * 60_000);
  });
});

describe('RANGE_SPECS', () => {
  it('classifies 1m and 5m as REALTIME', () => {
    expect(RANGE_SPECS['1m'].mode).toBe('realtime');
    expect(RANGE_SPECS['5m'].mode).toBe('realtime');
  });

  it('classifies 15m through 30d as HISTORIC', () => {
    const historicRanges: TelemetryRange[] = ['15m', '1h', '5h', '24h', '7d', '30d'];
    for (const r of historicRanges) {
      expect(RANGE_SPECS[r].mode).toBe('historic');
    }
  });

  it('keeps every HISTORIC bucket count under TB 1000-row limit', () => {
    const historicRanges: TelemetryRange[] = ['1h', '5h', '24h', '7d', '30d'];
    for (const r of historicRanges) {
      const spec = RANGE_SPECS[r];
      if (spec.interval === 0) continue; // 15m uses NONE/raw, bounded by TB limit
      const buckets = spec.windowMs / spec.interval;
      expect(buckets).toBeLessThanOrEqual(1000);
      expect(buckets).toBeGreaterThan(0);
    }
  });

  it('uses NONE aggregation for raw ranges and AVG for the bucketed ones', () => {
    expect(RANGE_SPECS['15m'].aggregation).toBe('NONE');
    expect(RANGE_SPECS['1h'].aggregation).toBe('AVG');
    expect(RANGE_SPECS['30d'].aggregation).toBe('AVG');
  });

  it('window sizes ascend monotonically', () => {
    const order: TelemetryRange[] = ['1m', '5m', '15m', '1h', '5h', '24h', '7d', '30d'];
    for (let i = 1; i < order.length; i++) {
      expect(RANGE_SPECS[order[i]].windowMs).toBeGreaterThan(RANGE_SPECS[order[i - 1]].windowMs);
    }
  });
});

describe('prefetchTelemetryRange', () => {
  function makeQueryClient() {
    return { prefetchQuery: vi.fn().mockResolvedValue(undefined) } as unknown as QueryClient;
  }

  it('is a no-op for REALTIME ranges (1m, 5m served by WS buffer)', async () => {
    const qc = makeQueryClient();
    await prefetchTelemetryRange(qc, 'FIT101', '1m');
    await prefetchTelemetryRange(qc, 'FIT101', '5m');
    expect((qc.prefetchQuery as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(0);
  });

  it('prefetches with the LOD ladder params for a HISTORIC range', async () => {
    const qc = makeQueryClient();
    await prefetchTelemetryRange(qc, 'FIT101', '24h');
    const calls = (qc.prefetchQuery as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls).toHaveLength(1);
    const arg = calls[0][0];
    expect(arg.queryKey).toEqual([
      'telemetry',
      'history',
      'FIT101',
      expect.any(Number),
      expect.any(Number),
      'AVG',
      15 * 60_000,
    ]);
    const [, , , startTs, endTs] = arg.queryKey;
    expect(endTs - startTs).toBe(RANGE_SPECS['24h'].windowMs);
    // endTs snapped to the bucket boundary
    expect(endTs % (15 * 60_000)).toBe(0);
  });

  it('uses interval=1 sentinel for the raw 15m range so the BFF query string is well-formed', async () => {
    const qc = makeQueryClient();
    await prefetchTelemetryRange(qc, 'FIT101', '15m');
    const arg = (qc.prefetchQuery as ReturnType<typeof vi.fn>).mock.calls[0][0];
    // interval=1 mirrors what the hook sends (RANGE_SPECS['15m'].interval is 0)
    expect(arg.queryKey[6]).toBe(1);
    expect(arg.queryKey[5]).toBe('NONE');
  });

  it('snaps endTs for the raw 15m range to a 60s grid (not 1s) so cache hits land', async () => {
    const qc = makeQueryClient();
    await prefetchTelemetryRange(qc, 'FIT101', '15m');
    const arg = (qc.prefetchQuery as ReturnType<typeof vi.fn>).mock.calls[0][0];
    const endTs = arg.queryKey[4];
    expect(endTs % 60_000).toBe(0);
  });
});

describe('gapThresholdFor', () => {
  it('uses an 8s threshold for REALTIME ranges so transport jitter on constant signals does not break the line', () => {
    expect(gapThresholdFor(RANGE_SPECS['1m'])).toBe(8_000);
    expect(gapThresholdFor(RANGE_SPECS['5m'])).toBe(8_000);
  });

  it('uses an 8s threshold for the raw 15m HISTORIC range (same 1 Hz tolerance as REALTIME)', () => {
    expect(gapThresholdFor(RANGE_SPECS['15m'])).toBe(8_000);
  });

  it('uses 2x bucket interval for bucketed HISTORIC ranges', () => {
    expect(gapThresholdFor(RANGE_SPECS['1h'])).toBe(2 * 60_000);
    expect(gapThresholdFor(RANGE_SPECS['24h'])).toBe(2 * 15 * 60_000);
    expect(gapThresholdFor(RANGE_SPECS['30d'])).toBe(2 * 4 * 60 * 60_000);
  });
});
