import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { InferenceMessage } from '@/types/inference';

vi.mock('@/contexts/TelemetryContext', () => ({
  useTelemetryContext: vi.fn(),
}));

vi.mock('@/hooks/useSensorsConfig', () => ({
  useSensorsConfig: vi.fn(),
}));

import { useTelemetryContext } from '@/contexts/TelemetryContext';
import { useSensorsConfig } from '@/hooks/useSensorsConfig';
import { useSensorInferences } from './useSensorInferences';

const useTelemetryContextMock = useTelemetryContext as unknown as ReturnType<typeof vi.fn>;
const useSensorsConfigMock = useSensorsConfig as unknown as ReturnType<typeof vi.fn>;

function makeMessage(opts: {
  modelName: string;
  ts: string;
  perProcess: Record<string, { level: number; level_name: string }>;
}): InferenceMessage {
  return {
    type: 'inference',
    channel: 'inferences',
    schema_version: '2.1',
    model_name: opts.modelName,
    inference_ts: opts.ts,
    identity: {
      name: opts.modelName,
      version: 'test',
      trained_at: '2026-01-01T00:00:00Z',
      threshold_source: 'mvp_seed',
    },
    valorRiesgo: 0,
    level_global: 0,
    level_global_name: 'NORMAL',
    plant: null,
    per_process: Object.fromEntries(
      Object.entries(opts.perProcess).map(([k, v]) => [
        k,
        { score: v.level, level: v.level, level_name: v.level_name as InferenceMessage['per_process'][string]['level_name'] },
      ]),
    ),
    devices: {},
    alarms_derived: { plant: false, per_process: {}, devices: {} },
    alarms_debounced: { plant: false, per_process: {}, devices: {}, kofn: { k: 0, n: 0 } },
    threshold_source: 'mvp_seed',
    show_verdict: true,
    observability: { level_summary: {}, level_distribution: {}, sensor_health: null },
  } as InferenceMessage;
}

const categoriesFixture = [
  { id: 'P1', name: 'P1', expanded: true, sensors: ['LIT101', 'FIT101'] },
  { id: 'P2', name: 'P2', expanded: false, sensors: ['AIT201'] },
];

describe('useSensorInferences', () => {
  beforeEach(() => {
    useTelemetryContextMock.mockReset();
    useSensorsConfigMock.mockReset();
    useSensorsConfigMock.mockReturnValue({ categories: categoriesFixture });
  });

  it('returns empty when the sensor has no configured process', () => {
    useTelemetryContextMock.mockReturnValue({ inferenceLog: [] });
    const { result } = renderHook(() => useSensorInferences('UNKNOWN'));
    expect(result.current).toEqual([]);
  });

  it('returns empty when no messages are buffered', () => {
    useTelemetryContextMock.mockReturnValue({ inferenceLog: [] });
    const { result } = renderHook(() => useSensorInferences('LIT101'));
    expect(result.current).toEqual([]);
  });

  it('surfaces only events whose process level is LOW (>=2) or higher', () => {
    const log: InferenceMessage[] = [
      makeMessage({
        modelName: 'M1',
        ts: '2026-05-20T12:00:00Z',
        perProcess: { P1: { level: 1, level_name: 'INFO' } }, // dropped
      }),
      makeMessage({
        modelName: 'M1',
        ts: '2026-05-20T12:01:00Z',
        perProcess: { P1: { level: 2, level_name: 'LOW' } },
      }),
      makeMessage({
        modelName: 'M2',
        ts: '2026-05-20T12:02:00Z',
        perProcess: { P1: { level: 4, level_name: 'HIGH' }, P2: { level: 5, level_name: 'CRITICAL' } },
      }),
    ];
    useTelemetryContextMock.mockReturnValue({ inferenceLog: log });
    const { result } = renderHook(() => useSensorInferences('LIT101'));
    expect(result.current).toHaveLength(2);
    expect(result.current[0]).toMatchObject({ level: 2, levelName: 'LOW', modelName: 'M1', processId: 'P1' });
    expect(result.current[1]).toMatchObject({ level: 4, levelName: 'HIGH', modelName: 'M2', processId: 'P1' });
  });

  it("ignores other processes' anomalies", () => {
    const log: InferenceMessage[] = [
      makeMessage({
        modelName: 'M1',
        ts: '2026-05-20T12:00:00Z',
        perProcess: { P1: { level: 1, level_name: 'INFO' }, P2: { level: 4, level_name: 'HIGH' } },
      }),
    ];
    useTelemetryContextMock.mockReturnValue({ inferenceLog: log });
    const { result } = renderHook(() => useSensorInferences('LIT101'));
    expect(result.current).toEqual([]);
  });

  it('parses inference_ts to ms epoch and drops malformed entries', () => {
    const log: InferenceMessage[] = [
      makeMessage({
        modelName: 'M1',
        ts: 'not-a-date',
        perProcess: { P1: { level: 3, level_name: 'MEDIUM' } },
      }),
      makeMessage({
        modelName: 'M1',
        ts: '2026-05-20T12:00:00Z',
        perProcess: { P1: { level: 3, level_name: 'MEDIUM' } },
      }),
    ];
    useTelemetryContextMock.mockReturnValue({ inferenceLog: log });
    const { result } = renderHook(() => useSensorInferences('LIT101'));
    expect(result.current).toHaveLength(1);
    expect(result.current[0].ts).toBe(Date.parse('2026-05-20T12:00:00Z'));
  });
});
