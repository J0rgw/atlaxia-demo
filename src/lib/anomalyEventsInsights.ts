/**
 * Insights del registro de eventos — lógica pura (testeable, sin React).
 *
 * - buildRangeInsights: KPIs del bento de resumen sobre los eventos de la
 *   franja temporal activa.
 * - Datos para los resúmenes FluvIA. ENFOQUE: parte de relevo de turno
 *   (handover) — estado global, dónde se concentró el problema, estado del
 *   trabajo humano (qué queda sin abordar) y continuidad entre episodios.
 *   Deliberadamente NO infiere causas ni prescribe actuaciones sobre el
 *   proceso (decisión de seguridad, docs/xai-graph/XAI-graph.md §10).
 */

import { SWAT_DEMO_DATASET } from '@/lib/xai/data';
import type { AnomalyEvent } from '@/types';

export type CritKey = 'crit' | 'high' | 'mid' | 'low';

export interface ProcessChip {
  pk: string;
  name: string;
  color: string;
}

export interface RangeInsights {
  total: number;
  candidates: number;
  confirmed: number;
  open: number;
  pending: number;
  confirmedReal: number;
  dismissedFp: number;
  /** Episodios abordados (con veredicto humano) sobre el total. */
  reviewedPct: number;
  /** Segundos acumulados en anomalía (episodios confirmados). */
  anomalySeconds: number;
  /** Fracción de la ventana pasada en anomalía (0..1). */
  anomalyFraction: number;
  maxLevel: number;
  maxLevelEventId: number | null;
  crit: CritKey;
  topSensors: { sensor: string; count: number }[];
  processes: ProcessChip[];
  /** Sensor presente en más episodios (≥2) — señal de continuidad. */
  recurrentSensor: { sensor: string; count: number } | null;
  openEventId: number | null;
  /** Ventana real de actividad dentro de la franja (ms epoch), o null si vacía. */
  activityFrom: number | null;
  activityTo: number | null;
}

function critOfLevel(level: number): CritKey {
  if (level >= 5) return 'crit';
  if (level >= 4) return 'high';
  if (level >= 3) return 'mid';
  return 'low';
}

export const CRIT_LABEL: Record<CritKey, string> = {
  crit: 'crítica',
  high: 'alta',
  mid: 'media',
  low: 'baja',
};

export function processChipOf(sensor: string): ProcessChip | null {
  const pk = SWAT_DEMO_DATASET.procOf[sensor];
  if (!pk) return null;
  return {
    pk,
    name: SWAT_DEMO_DATASET.procName[pk] ?? pk,
    color: SWAT_DEMO_DATASET.procColor[pk] ?? '#64748b',
  };
}

export function buildRangeInsights(
  events: AnomalyEvent[],
  window: { from: number; to: number }
): RangeInsights {
  const confirmedEvents = events.filter((e) => !e.posible);
  const open = events.filter((e) => e.closed_reason === null);
  const reviewed = events.filter((e) => e.review_status !== 'pending_review');

  const sensorCount = new Map<string, number>();
  for (const e of events) {
    for (const s of e.sensores_involucrados) {
      sensorCount.set(s, (sensorCount.get(s) ?? 0) + 1);
    }
  }
  const topSensors = [...sensorCount.entries()]
    .map(([sensor, count]) => ({ sensor, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  const processes = new Map<string, ProcessChip>();
  for (const [sensor] of sensorCount) {
    const chip = processChipOf(sensor);
    if (chip) processes.set(chip.pk, chip);
  }

  const anomalySeconds = confirmedEvents.reduce((s, e) => s + e.duracion_segundos, 0);
  const windowSeconds = Math.max(1, (window.to - window.from) / 1000);

  const maxLevelEvent = events.reduce<AnomalyEvent | null>(
    (best, e) => (best === null || e.nivel_pico > best.nivel_pico ? e : best),
    null
  );

  const recurrent = topSensors[0] && topSensors[0].count >= 2 ? topSensors[0] : null;

  const starts = events.map((e) => Date.parse(e.tiempo_inicio));
  const ends = events.map((e) =>
    e.closed_reason === null ? Date.now() : Date.parse(e.tiempo_fin)
  );

  return {
    total: events.length,
    candidates: events.filter((e) => e.posible).length,
    confirmed: confirmedEvents.length,
    open: open.length,
    pending: events.length - reviewed.length,
    confirmedReal: events.filter((e) => e.review_status === 'confirmed_real').length,
    dismissedFp: events.filter((e) => e.review_status === 'dismissed_fp').length,
    reviewedPct: events.length ? Math.round((reviewed.length / events.length) * 100) : 0,
    anomalySeconds,
    anomalyFraction: Math.min(1, anomalySeconds / windowSeconds),
    maxLevel: maxLevelEvent?.nivel_pico ?? 0,
    maxLevelEventId: maxLevelEvent?.id ?? null,
    crit: critOfLevel(maxLevelEvent?.nivel_pico ?? 0),
    topSensors,
    processes: [...processes.values()].sort((a, b) => a.pk.localeCompare(b.pk)),
    recurrentSensor: recurrent,
    openEventId: open[0]?.id ?? null,
    activityFrom: starts.length ? Math.min(...starts) : null,
    activityTo: ends.length ? Math.max(...ends) : null,
  };
}

export interface EventInsights {
  crit: CritKey;
  firstSignal: string;
  otherSignals: string[];
  processes: ProcessChip[];
  reviewed: boolean;
}

/** Datos para el resumen FluvIA de UN episodio (mismas reglas: sin causas). */
export function buildEventInsights(event: AnomalyEvent): EventInsights {
  const [first, ...rest] = event.sensores_involucrados;
  const processes = new Map<string, ProcessChip>();
  for (const s of event.sensores_involucrados) {
    const chip = processChipOf(s);
    if (chip) processes.set(chip.pk, chip);
  }
  return {
    crit: critOfLevel(event.nivel_pico),
    firstSignal: first ?? '—',
    otherSignals: rest.slice(0, 3),
    processes: [...processes.values()].sort((a, b) => a.pk.localeCompare(b.pk)),
    reviewed: event.review_status !== 'pending_review',
  };
}
