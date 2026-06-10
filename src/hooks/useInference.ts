/**
 * React Query hooks for the BFF v2.1 inference endpoints.
 *
 * - useInferenceLatest:  bootstrap last cached message per model (REST).
 * - useInferenceModels:  catalogue of loaded models.
 * - useInferenceHealthSummary: pipeline + ETL freshness for header chips.
 *
 * WS is the streaming SoT (canal 'inferences'); these REST hooks complete
 * the picture for first paint + health monitoring.
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  LoadedModelsResponse,
  InferenceHealthSummary,
  InferenceLatestResponse,
  InferenceHistoryResponse,
} from '@/types/inference';

export function useInferenceModels() {
  return useQuery({
    queryKey: ['inference', 'models'],
    queryFn: () => api.get<LoadedModelsResponse>('/api/inference/models'),
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
    retry: 2,
  });
}

export function useInferenceHealthSummary(refetchInterval: number | false = 30_000) {
  return useQuery({
    queryKey: ['inference', 'health-summary'],
    queryFn: () => api.get<InferenceHealthSummary>('/api/inference/health-summary'),
    refetchInterval,
    retry: 2,
  });
}

export function useInferenceLatest() {
  return useQuery({
    queryKey: ['inference', 'latest'],
    queryFn: () => api.get<InferenceLatestResponse>('/api/inference/latest'),
    staleTime: 5 * 60_000,
    retry: 2,
  });
}

/**
 * Fetch persisted inference events for a wall-clock window. Pass
 * `sensorKey='__plant__'` (the default) to query plant-level rollups —
 * see B17 follow-up for the per-sensor variant.
 */
export function useInferenceHistory(
  startTs: number,
  endTs: number,
  opts: { sensorKey?: string; enabled?: boolean } = {},
) {
  const { sensorKey = '__plant__', enabled = true } = opts;
  const params = new URLSearchParams({
    sensor_key: sensorKey,
    startTs: String(startTs),
    endTs: String(endTs),
  });
  return useQuery({
    queryKey: ['inferences', 'history', sensorKey, startTs, endTs],
    queryFn: () =>
      api.get<InferenceHistoryResponse>(`/api/inferences/history?${params.toString()}`),
    enabled: enabled && Number.isFinite(startTs) && Number.isFinite(endTs) && endTs > startTs,
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: false,
    retry: 2,
  });
}
