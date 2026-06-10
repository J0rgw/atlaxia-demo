import { useMemo } from 'react';
import { useTelemetryContext } from '@/contexts/TelemetryContext';
import { useInferenceLatest } from '@/hooks/useInference';
import type { LayerEntry, LevelName, InferenceMessage } from '@/types/inference';
import { LEVEL_NAME_BY_INT } from '@/lib/inferenceLevel';

/**
 * - `idle`/`loading`: bootstrap pending, render skeleton.
 * - `ready`: at least one model with `show_verdict: true` provided per_process.
 * - `empty`: no inference messages received at all (cold start, no models).
 * - `awaiting-calibration`: messages received but every model still has
 *   `show_verdict: false` — the BFF is suppressing the verdict because the
 *   anomaly threshold has not been validated against this client's data yet.
 * - `error`: bootstrap query errored.
 */
export type ProcessCriticalityStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'empty'
  | 'awaiting-calibration'
  | 'error';

export const PROCESS_IDS = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'] as const;
export type ProcessId = (typeof PROCESS_IDS)[number];

export interface ProcessCriticalityEntry extends LayerEntry {
  /** Name of the model whose entry won (max-level across models). */
  contributingModel: string | null;
}

export interface ProcessCriticalityResult {
  status: ProcessCriticalityStatus;
  perProcess: Record<ProcessId, ProcessCriticalityEntry>;
  /** Latest inference timestamp across models (newest), if any. */
  inferenceTs: string | null;
  /** Number of models that contributed (anything with per_process data). */
  modelCount: number;
  error: Error | null;
}

const EMPTY_ENTRY: ProcessCriticalityEntry = {
  score: 0,
  level: -1,
  level_name: 'UNKNOWN',
  contributingModel: null,
};

function emptyPerProcess(): Record<ProcessId, ProcessCriticalityEntry> {
  return {
    P1: { ...EMPTY_ENTRY },
    P2: { ...EMPTY_ENTRY },
    P3: { ...EMPTY_ENTRY },
    P4: { ...EMPTY_ENTRY },
    P5: { ...EMPTY_ENTRY },
    P6: { ...EMPTY_ENTRY },
  };
}

function reduceCrossModel(
  messages: InferenceMessage[],
): { perProcess: Record<ProcessId, ProcessCriticalityEntry>; newestTs: string | null } {
  const perProcess = emptyPerProcess();
  let newestTs: string | null = null;

  for (const msg of messages) {
    if (!msg || !msg.per_process) continue;
    if (!newestTs || (msg.inference_ts && msg.inference_ts > newestTs)) {
      newestTs = msg.inference_ts ?? newestTs;
    }
    for (const pid of PROCESS_IDS) {
      const entry = msg.per_process[pid];
      if (!entry) continue;
      const current = perProcess[pid];
      const winsByLevel = entry.level > current.level;
      const winsByScore = entry.level === current.level && entry.score > current.score;
      if (winsByLevel || winsByScore || current.contributingModel === null) {
        // Normalize level_name in case the BFF sends an unknown string.
        const safeLevelName: LevelName =
          (entry.level_name as LevelName) ?? LEVEL_NAME_BY_INT[entry.level] ?? 'UNKNOWN';
        perProcess[pid] = {
          score: entry.score,
          level: entry.level,
          level_name: safeLevelName,
          contributingModel: msg.model_name,
        };
      }
    }
  }

  return { perProcess, newestTs };
}

export function useProcessCriticality(): ProcessCriticalityResult {
  const { latestInferenceByModel } = useTelemetryContext();
  const inferenceLatestQuery = useInferenceLatest();

  return useMemo<ProcessCriticalityResult>(() => {
    const messages = Object.values(latestInferenceByModel);
    const hasMessages = messages.length > 0;

    if (hasMessages) {
      // Filter out models that the BFF is suppressing because their threshold
      // hasn't been validated (show_verdict === false). Treat undefined as
      // verdict-trusted to be tolerant of older schemas.
      const verdictMessages = messages.filter((m) => m.show_verdict !== false);

      if (verdictMessages.length === 0) {
        return {
          status: 'awaiting-calibration',
          perProcess: emptyPerProcess(),
          inferenceTs: null,
          modelCount: messages.length,
          error: null,
        };
      }

      const { perProcess, newestTs } = reduceCrossModel(verdictMessages);
      const anyEntry = Object.values(perProcess).some((p) => p.contributingModel !== null);
      return {
        status: anyEntry ? 'ready' : 'empty',
        perProcess,
        inferenceTs: newestTs,
        modelCount: verdictMessages.length,
        error: null,
      };
    }

    if (inferenceLatestQuery.isLoading) {
      return {
        status: 'loading',
        perProcess: emptyPerProcess(),
        inferenceTs: null,
        modelCount: 0,
        error: null,
      };
    }

    if (inferenceLatestQuery.isError) {
      return {
        status: 'error',
        perProcess: emptyPerProcess(),
        inferenceTs: null,
        modelCount: 0,
        error: (inferenceLatestQuery.error as Error) ?? new Error('inference latest failed'),
      };
    }

    return {
      status: 'empty',
      perProcess: emptyPerProcess(),
      inferenceTs: null,
      modelCount: 0,
      error: null,
    };
  }, [latestInferenceByModel, inferenceLatestQuery.isLoading, inferenceLatestQuery.isError, inferenceLatestQuery.error]);
}
