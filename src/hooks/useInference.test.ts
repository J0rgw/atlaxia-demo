import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
  },
}));

import { api } from '@/lib/api';
import {
  useInferenceModels,
  useInferenceHealthSummary,
  useInferenceLatest,
} from './useInference';

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchInterval: false } },
  });
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children);
  return wrapper;
}

describe('useInference hooks', () => {
  const mockedGet = api.get as unknown as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockedGet.mockReset();
  });

  it('useInferenceModels calls /api/inference/models', async () => {
    mockedGet.mockResolvedValue({
      schema_version: '2.0',
      models: {
        STGNN_TOPK_Cont: {
          name: 'STGNN_TOPK_Cont',
          version: 'v1',
          trained_at: '2026-05-11T07:18:17Z',
          threshold_source: 'calibrator_val_bands',
          consumption_mode: 'aggregated',
          bucket_window_s: 10,
          seq_in_len: 12,
          anomaly_threshold_level: 3,
          aggregation_method: 'Mediana_10s',
        },
      },
    });

    const { result } = renderHook(() => useInferenceModels(), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedGet).toHaveBeenCalledWith('/api/inference/models');
    expect(result.current.data?.models.STGNN_TOPK_Cont.name).toBe('STGNN_TOPK_Cont');
  });

  it('useInferenceHealthSummary calls /api/inference/health-summary', async () => {
    mockedGet.mockResolvedValue({
      state: 'ok',
      reason: null,
      last_webhook_ts: '2026-05-18T15:30:42Z',
      last_webhook_age_seconds: 4.2,
      last_ready: { ok: true },
      models_loaded_count: 1,
      etl: {
        ok: true,
        status: 'ok',
        data_freshness_ms: 1250,
        stale: false,
        last_poll_ts: '2026-05-18T15:30:42Z',
      },
    });

    const { result } = renderHook(() => useInferenceHealthSummary(), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedGet).toHaveBeenCalledWith('/api/inference/health-summary');
    expect(result.current.data?.state).toBe('ok');
    expect(result.current.data?.etl.data_freshness_ms).toBe(1250);
  });

  it('useInferenceLatest calls /api/inference/latest', async () => {
    mockedGet.mockResolvedValue({ models: {} });

    const { result } = renderHook(() => useInferenceLatest(), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedGet).toHaveBeenCalledWith('/api/inference/latest');
    expect(result.current.data?.models).toEqual({});
  });

  it('useInferenceHealthSummary surfaces network errors', async () => {
    mockedGet.mockRejectedValue({ detail: 'down', status: 503 });

    const { result } = renderHook(() => useInferenceHealthSummary(), {
      wrapper: makeWrapper(),
    });

    // hook configures retry: 2, so allow extra time for retries to exhaust
    await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 5000 });
  });
});
