/**
 * Fixtures de anomaly_events para el prototipo UI (sin BFF).
 *
 * Episodios sintéticos pero fieles al contrato del SPEC
 * (docs/handoff/anomaly-event-register/SPEC.md §5): mezcla de candidatos
 * sub-umbral (posible=true), episodios confirmados por duración, un episodio
 * abierto (closed_reason=null) y los tres estados de revisión humana.
 * Sensores y procesos reales del testbench SWAT.
 *
 * Generación determinista (LCG con seed por episodio) para que la UI y los
 * tests sean estables entre ejecuciones.
 */

import type {
  AnomalyEvent,
  EventAnnotation,
  InferenceRef,
  ReviewStatus,
  ClosedReason,
} from '@/types';

const MIN = 60_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;

function lcg(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function levelOf(v: number): number {
  if (v < 0.4) return 1;
  if (v < 0.55) return 2;
  if (v < 0.7) return 3;
  if (v < 0.85) return 4;
  return 5;
}

/** Racha de puntos a 1 muestra/s: campana centrada + ruido determinista. */
function mkRefs(startMs: number, durationS: number, peak: number, seed: number): InferenceRef[] {
  const rnd = lcg(seed);
  const refs: InferenceRef[] = [];
  const center = durationS / 2;
  const width = Math.max(2, durationS / 3.2);
  for (let t = 0; t <= durationS; t++) {
    const bump = peak * Math.exp(-((t - center) ** 2) / (2 * width * width));
    const v = Math.min(1, Math.max(0.05, bump + (rnd() - 0.5) * 0.12));
    refs.push({
      sample_ts: new Date(startMs + t * 1000).toISOString(),
      plant_level: levelOf(v),
      valorRiesgo: Math.round(v * 1000) / 1000,
    });
  }
  return refs;
}

interface EpisodeSeed {
  id: number;
  model: string;
  agoMs: number;
  durationS: number;
  peak: number;
  posible: boolean;
  review: ReviewStatus;
  sensores: string[];
  closed: ClosedReason;
  gestor?: string;
  /** Anotaciones humanas: minutos después del fin del episodio. */
  notas?: { author: string; text: string; minAfter: number }[];
}

const SEEDS: EpisodeSeed[] = [
  // Episodio ABIERTO (en curso): confirmado por duración, aún sin cierre.
  { id: 18, model: 'STGNN_TOPK_Cont', agoMs: 4 * MIN, durationS: 215, peak: 0.96, posible: false, review: 'pending_review', sensores: ['AIT202', 'LIT301', 'DPIT301'], closed: null },
  { id: 17, model: 'STGNN_TOPK_Cont', agoMs: 35 * MIN, durationS: 12, peak: 0.78, posible: true, review: 'pending_review', sensores: ['DPIT301'], closed: 'guard_expired' },
  { id: 16, model: 'STGNN_TOPK_Cont', agoMs: 2 * HOUR, durationS: 95, peak: 0.93, posible: false, review: 'pending_review', sensores: ['AIT202', 'AIT203', 'LIT301', 'MV201'], closed: 'guard_expired' },
  { id: 15, model: 'STGNN_TOPK_Cont', agoMs: 5 * HOUR, durationS: 8, peak: 0.74, posible: true, review: 'dismissed_fp', sensores: ['FIT401'], closed: 'guard_expired', gestor: 'M. García' },
  {
    id: 14, model: 'STGNN_TOPK_Cont', agoMs: 9 * HOUR, durationS: 210, peak: 0.97, posible: false, review: 'confirmed_real', sensores: ['LIT101', 'FIT101', 'MV101', 'P101'], closed: 'guard_expired',
    gestor: 'J. Pérez',
    notas: [
      { author: 'J. Pérez', text: 'Revisada telemetría de la bomba P101: el estado no respondía a la orden del PLC durante ~3 min.', minAfter: 25 },
      { author: 'J. Pérez', text: 'Abierta incidencia con mantenimiento para inspección de la válvula MV101.', minAfter: 50 },
    ],
  },
  { id: 13, model: 'STGNN_TOPK_Cont', agoMs: 21 * HOUR, durationS: 15, peak: 0.76, posible: true, review: 'pending_review', sensores: ['AIT201', 'AIT202'], closed: 'guard_expired' },
  {
    id: 12, model: 'STGNN_TOPK_Disc', agoMs: 1.2 * DAY, durationS: 64, peak: 0.81, posible: false, review: 'dismissed_fp', sensores: ['DPIT301', 'MV301'], closed: 'guard_expired',
    gestor: 'M. García',
    notas: [
      { author: 'M. García', text: 'Coincide con el retrolavado programado de las 10:30. Contrastado con el plan de mantenimiento — descartado.', minAfter: 40 },
    ],
  },
  {
    id: 11, model: 'STGNN_TOPK_Cont', agoMs: 2 * DAY, durationS: 300, peak: 0.98, posible: false, review: 'confirmed_real', sensores: ['AIT202', 'LIT301', 'MV201', 'FIT201', 'DPIT301'], closed: 'guard_expired',
    gestor: 'J. Pérez',
    notas: [
      { author: 'Equipo SOC', text: 'Episodio de referencia del corredor químico→UF. Documentado para el informe semanal.', minAfter: 120 },
    ],
  },
  { id: 10, model: 'STGNN_TOPK_Disc', agoMs: 3.5 * DAY, durationS: 6, peak: 0.72, posible: true, review: 'dismissed_fp', sensores: ['P301'], closed: 'guard_expired', gestor: 'A. Ruiz' },
  { id: 9, model: 'STGNN_TOPK_Cont', agoMs: 5 * DAY, durationS: 120, peak: 0.88, posible: false, review: 'confirmed_real', sensores: ['FIT301', 'LIT301'], closed: 'guard_expired', gestor: 'A. Ruiz' },
  // Cerrado por sweep de arranque (reinicio del BFF a mitad de episodio).
  { id: 8, model: 'STGNN_TOPK_Disc', agoMs: 6.5 * DAY, durationS: 45, peak: 0.83, posible: false, review: 'pending_review', sensores: ['AIT401', 'FIT401'], closed: 'startup_sweep' },
  { id: 7, model: 'STGNN_TOPK_Cont', agoMs: 12 * DAY, durationS: 180, peak: 0.95, posible: false, review: 'confirmed_real', sensores: ['LIT301', 'DPIT301', 'MV301', 'P301'], closed: 'guard_expired' },
  { id: 6, model: 'STGNN_TOPK_Disc', agoMs: 18 * DAY, durationS: 10, peak: 0.73, posible: true, review: 'dismissed_fp', sensores: ['MV101'], closed: 'guard_expired' },
  { id: 5, model: 'STGNN_TOPK_Cont', agoMs: 25 * DAY, durationS: 150, peak: 0.86, posible: false, review: 'dismissed_fp', sensores: ['AIT203', 'AIT201'], closed: 'guard_expired' },
  // Fuera de la ventana de 30 días — solo visible con rango "todo".
  { id: 4, model: 'STGNN_TOPK_Cont', agoMs: 40 * DAY, durationS: 90, peak: 0.89, posible: false, review: 'confirmed_real', sensores: ['FIT101', 'LIT101'], closed: 'guard_expired' },
];

function mkEvent(s: EpisodeSeed, now: number): AnomalyEvent {
  const startMs = now - s.agoMs;
  const refs = mkRefs(startMs, s.durationS, s.peak, s.id * 7919);
  const endMs = startMs + s.durationS * 1000;
  const reviewed = s.review !== 'pending_review';
  const reviewedAt = reviewed ? new Date(endMs + 45 * MIN).toISOString() : null;
  const anotaciones: EventAnnotation[] = (s.notas ?? []).map((n, i) => ({
    id: s.id * 100 + i + 1,
    author: n.author,
    text: n.text,
    created_at: new Date(endMs + n.minAfter * MIN).toISOString(),
  }));
  return {
    id: s.id,
    model_name: s.model,
    tiempo_inicio: new Date(startMs).toISOString(),
    tiempo_fin: new Date(endMs).toISOString(),
    posible: s.posible,
    review_status: s.review,
    reviewed_by: reviewed ? 1 : null,
    reviewed_at: reviewedAt,
    nivel_pico: Math.max(...refs.map((r) => r.plant_level)),
    n_detecciones: refs.filter((r) => r.plant_level >= 4).length,
    duracion_segundos: s.durationS,
    sensores_involucrados: s.sensores,
    inference_refs: refs,
    closed_reason: s.closed,
    gestor: s.gestor ?? null,
    abordado_at: s.gestor ? new Date(endMs + 20 * MIN).toISOString() : null,
    anotaciones,
    created_at: new Date(startMs + 2000).toISOString(),
    updated_at: reviewedAt ?? new Date(endMs).toISOString(),
  };
}

/**
 * Devuelve una copia fresca del seed — el store mock la muta sin tocar este
 * módulo. El "ahora" se toma en cada llamada (no a la carga del módulo) para
 * que los offsets no deriven fuera de las ventanas 24h/7d/30d en sesiones de
 * dev largas con HMR.
 */
export function seedAnomalyEvents(): AnomalyEvent[] {
  const now = Date.now();
  return SEEDS.map((s) => mkEvent(s, now));
}
