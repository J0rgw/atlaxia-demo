/**
 * Types for BFF inference v2.1 contract.
 *
 * Mirrors the schema documented in docs/handoff-front.md (SoT) and produced
 * by src/back/src/services/inference_processor.py. Tipos a mano (no
 * generados desde OpenAPI) — el front mantiene el patrón legacy.
 */

export type ThresholdSource =
  | 'mvp_seed'
  | 'calibrator_val_p99'
  | 'calibrator_val_bands'
  | 'evaluator_f1_optimal';

export type LevelName =
  | 'NORMAL'
  | 'INFO'
  | 'LOW'
  | 'MEDIUM'
  | 'HIGH'
  | 'CRITICAL'
  | 'UNKNOWN';

export interface ModelIdentity {
  name: string;
  version: string;
  trained_at: string;
  threshold_source: ThresholdSource;
}

export interface LayerEntry {
  score: number;
  level: number;
  level_name: LevelName;
}

export interface DeviceEntry {
  score: number;
  level: number;
  level_name: LevelName;
}

export interface AlarmsBlock {
  plant: boolean;
  per_process: Record<string, boolean>;
  devices: Record<string, boolean>;
}

export interface AlarmsDebouncedBlock extends AlarmsBlock {
  kofn: { k: number; n: number };
}

export type SensorHealth = 'healthy' | 'stuck' | 'nan' | 'out_of_range';

export interface InferenceObservability {
  level_summary: Record<string, number>;
  level_distribution: Record<string, number>;
  sensor_health: Record<string, SensorHealth> | null;
}

export interface InferenceMessage {
  type: 'inference';
  channel: 'inferences';
  schema_version: '2.1';
  model_name: string;
  inference_ts: string;
  identity: ModelIdentity;
  valorRiesgo: number;
  level_global: number;
  level_global_name: LevelName;
  plant: LayerEntry | null;
  per_process: Record<string, LayerEntry>;
  devices: Record<string, DeviceEntry>;
  alarms_derived: AlarmsBlock;
  alarms_debounced: AlarmsDebouncedBlock;
  threshold_source: ThresholdSource;
  show_verdict: boolean;
  observability: InferenceObservability;
}

export interface LoadedModelInfo {
  name: string;
  version: string;
  trained_at: string;
  threshold_source: ThresholdSource;
  consumption_mode: 'raw' | 'aggregated';
  bucket_window_s: number | null;
  seq_in_len: number;
  anomaly_threshold_level: number;
  aggregation_method: string | null;
}

export interface LoadedModelsResponse {
  schema_version: '2.0';
  models: Record<string, LoadedModelInfo>;
}

export type HealthState = 'ok' | 'warmup' | 'degraded' | 'outage';

export interface InferenceHealthEtl {
  ok: boolean;
  status: string | null;
  data_freshness_ms: number | null;
  stale: boolean | null;
  last_poll_ts: string | null;
}

export interface InferenceHealthSummary {
  state: HealthState;
  reason: string | null;
  last_webhook_ts: string | null;
  last_webhook_age_seconds: number | null;
  last_ready: { ok: boolean; reason?: string; body?: unknown };
  models_loaded_count: number;
  etl: InferenceHealthEtl;
}

export interface InferenceLatestResponse {
  models: Record<string, InferenceMessage>;
}

/**
 * Persisted inference event row returned by /api/inferences/history. The BFF
 * uses `sensor_key = "__plant__"` as a request-side sentinel to filter
 * `inference_events.sensor_key IS NULL` — see backend handoff 2026-05-20
 * (B17 tracks the per-device contract follow-up). Until then HISTORIC
 * markers are plant-level only.
 */
export interface InferenceEventOut {
  inference_ts: number;
  sensor_key: string | null;
  model_name: string;
  level: number;
  level_name: LevelName;
}

export interface InferenceHistoryResponse {
  events: InferenceEventOut[];
  startTs: number;
  endTs: number;
}
