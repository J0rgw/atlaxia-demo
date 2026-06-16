/**
 * Series sintéticas por sensor para el detalle de un episodio (sin backend).
 *
 * En producto saldrán de telemetría real (observado) + reconstrucción del
 * modelo (esperado) vía replay de la ventana del evento. Aquí se sintetizan
 * de forma DETERMINISTA (seed por evento+sensor) usando los rangos normales
 * reales del testbench SWAT (lib/xai/data → sensorMeta) para que magnitudes
 * y unidades sean plausibles.
 */

import { SWAT_DEMO_DATASET } from '@/lib/xai/data';
import type { AnomalyEvent } from '@/types';

export interface EventSensorScore {
  sensor: string;
  /** Score de riesgo registrado para el sensor durante el episodio (0..1). */
  score: number;
  /** true si el sensor formó parte de sensores_involucrados del episodio. */
  involved: boolean;
  /** Descripción física del sensor (metadata SWAT). */
  desc: string;
}

export interface SensorSeriesPoint {
  ts: number;
  observed: number;
  expected: number;
}

export interface EventSensorSeries {
  sensor: string;
  unit: string;
  desc: string;
  points: SensorSeriesPoint[];
}

/** Fracción de padding temporal a cada lado del evento (10% de la duración). */
export const EVENT_WINDOW_PAD = 0.1;
const N_POINTS = 140;

function lcg(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function hashSensor(id: string): number {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) & 0x7fffffff;
  return h;
}

function eventPeak(event: AnomalyEvent): number {
  return event.inference_refs.reduce((m, r) => Math.max(m, r.valorRiesgo), 0);
}

/**
 * Scores de riesgo por sensor del episodio, ordenados descendente — para
 * TODOS los sensores de la planta, como hace el modelo real: los involucrados
 * con score alto (el primero ≈ pico del evento), el resto con score residual
 * de fondo. Determinista por evento+sensor.
 */
export function eventSensorScores(event: AnomalyEvent): EventSensorScore[] {
  const peak = eventPeak(event);
  const rnd = lcg(event.id * 31337);
  const involvedRank = new Map(event.sensores_involucrados.map((s, i) => [s, i]));
  return SWAT_DEMO_DATASET.nodes
    .map(({ id }) => {
      const rank = involvedRank.get(id);
      const involved = rank !== undefined;
      const score = involved
        ? Math.max(0.05, Math.min(1, peak - rank * 0.09 - rnd() * 0.06))
        : Math.max(0.01, 0.04 + rnd() * 0.11);
      return {
        sensor: id,
        score,
        involved,
        desc: SWAT_DEMO_DATASET.sensorMeta[id]?.desc ?? id,
      };
    })
    .sort((a, b) => b.score - a.score);
}

/**
 * Serie observado/esperado del sensor sobre la ventana del evento con
 * EVENT_WINDOW_PAD de margen a cada lado. El esperado es la línea base suave
 * del régimen normal; el observado se desvía dentro del evento de forma
 * proporcional al score del sensor (rampa de entrada/salida + ruido leve).
 */
export function eventSensorSeries(event: AnomalyEvent, sensor: string): EventSensorSeries {
  const meta = SWAT_DEMO_DATASET.sensorMeta[sensor];
  const lo = meta?.nlo ?? 0;
  const hi = meta?.nhi ?? 1;
  const mid = (lo + hi) / 2;
  const span = (hi - lo) || 1;

  const startMs = Date.parse(event.tiempo_inicio);
  const endMs = Date.parse(event.tiempo_fin);
  const durMs = Math.max(endMs - startMs, 1_000);
  const pad = durMs * EVENT_WINDOW_PAD;
  const t0 = startMs - pad;
  const t1 = endMs + pad;

  const score = eventSensorScores(event).find((s) => s.sensor === sensor)?.score ?? 0.4;
  const rnd = lcg(event.id * 7919 + hashSensor(sensor));
  const phase = rnd() * Math.PI * 2;
  const dir = rnd() > 0.5 ? 1 : -1;

  const points: SensorSeriesPoint[] = [];
  for (let i = 0; i <= N_POINTS; i++) {
    const ts = t0 + ((t1 - t0) * i) / N_POINTS;
    // línea base del régimen normal: onda lenta dentro del rango nominal
    const expected = mid + Math.sin((i / N_POINTS) * Math.PI * 2.4 + phase) * span * 0.16;
    // desviación solo dentro del evento, con rampa suave en los bordes
    let deviation = 0;
    if (ts >= startMs && ts <= endMs) {
      const u = (ts - startMs) / durMs;
      const ramp = Math.min(1, Math.min(u, 1 - u) * 6);
      deviation = dir * span * score * 0.9 * ramp;
    }
    const noise = (rnd() - 0.5) * span * 0.025;
    points.push({
      ts,
      observed: expected + deviation + noise,
      expected,
    });
  }
  return {
    sensor,
    unit: meta?.unit ?? '',
    desc: meta?.desc ?? sensor,
    points,
  };
}
