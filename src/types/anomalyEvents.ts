/**
 * Types for the anomaly events registry (episodios de anomalía).
 *
 * Mirrors the future BFF contract defined in
 * docs/handoff/anomaly-event-register/SPEC.md (§5 tabla anomaly_events,
 * §7 REST GET/PATCH + canal WS). Tipos a mano (no generados) — patrón
 * legacy del front, igual que types/inference.ts.
 */

/** Eje HUMANO — solo lo escribe el cliente vía PATCH. */
export type ReviewStatus = 'pending_review' | 'confirmed_real' | 'dismissed_fp';

/** Por qué se cerró el episodio; null = episodio aún abierto. */
export type ClosedReason = 'guard_expired' | 'startup_sweep' | null;

/** Punto de la racha persistido en el JSONB inference_refs. */
export interface InferenceRef {
  sample_ts: string;
  plant_level: number;
  valorRiesgo: number;
}

/** Anotación humana sobre un episodio (técnico, supervisión, SOC…). */
export interface EventAnnotation {
  id: number;
  author: string;
  text: string;
  created_at: string;
}

/**
 * Fila de anomaly_events. Dos ejes ortogonales:
 * - `posible` (SISTEMA): true = candidato sub-umbral (< DETECTION_SECONDS),
 *   false = episodio confirmado por duración.
 * - `review_status` (HUMANO): feedback del operador, independiente del anterior.
 */
export interface AnomalyEvent {
  id: number;
  model_name: string;
  tiempo_inicio: string;
  tiempo_fin: string;
  posible: boolean;
  review_status: ReviewStatus;
  reviewed_by: number | null;
  reviewed_at: string | null;
  nivel_pico: number;
  n_detecciones: number;
  duracion_segundos: number;
  sensores_involucrados: string[];
  inference_refs: InferenceRef[];
  closed_reason: ClosedReason;
  /** Responsable gestor del episodio (eje humano, como review_status). */
  gestor: string | null;
  /** Cuándo se abordó (asignación de responsable). */
  abordado_at: string | null;
  anotaciones: EventAnnotation[];
  created_at: string;
  updated_at: string;
}

/** Rango temporal del listado. 'yesterday' = el día anterior completo (00:00–24:00). */
export type AnomalyEventRange = '24h' | 'yesterday' | '7d' | 'custom';

/** Filtros del listado — espejo de los query params del futuro GET /api/anomaly-events. */
export interface AnomalyEventFilters {
  range: AnomalyEventRange;
  /** ISO — solo con range='custom'. */
  customFrom?: string;
  customTo?: string;
  posible: 'all' | 'candidate' | 'confirmed';
  review_status: 'all' | ReviewStatus;
}

export interface AnomalyEventsResponse {
  events: AnomalyEvent[];
  total: number;
}

/** Transiciones del canal WS `anomaly_events` (SPEC §7) — integración futura. */
export type AnomalyEventTransition = 'created' | 'updated' | 'confirmed_system' | 'closed';
