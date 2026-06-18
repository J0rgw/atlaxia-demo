/**
 * Escala de calor ISA-101 ("subdued until alarmed") + severidad textual.
 * El extremo crítico es el tono MÁS OSCURO de la escala: la criticidad se
 * distingue también en escala de grises / daltonismo, no solo por color (a11y).
 */

import type { ValueOf } from '@/lib/badges';

type AnomalyValue = ValueOf<'anomaly'>;

const HEAT_STOPS: [number, [number, number, number]][] = [
  [0, [139, 148, 158]], // calmo gris muted
  [0.4, [210, 153, 34]], // warning ámbar
  [0.7, [248, 81, 73]], // critical
  [1, [218, 54, 51]], // emergency (el más oscuro)
];

export function heat(value: number): string {
  const v = Math.max(0, Math.min(1, value));
  for (let i = 1; i < HEAT_STOPS.length; i++) {
    if (v <= HEAT_STOPS[i][0]) {
      const [a, ca] = HEAT_STOPS[i - 1];
      const [b, cb] = HEAT_STOPS[i];
      const f = (v - a) / (b - a);
      const c = ca.map((x, j) => Math.round(x + (cb[j] - x) * f));
      return `rgb(${c[0]},${c[1]},${c[2]})`;
    }
  }
  return 'rgb(218,54,51)';
}

export function sev(v: number): string {
  if (v >= 0.8) return 'Muy anómalo';
  if (v >= 0.6) return 'Anómalo';
  if (v >= 0.4) return 'Algo anómalo';
  return 'Leve';
}

/**
 * Grado de anomalía → valor del eje `anomaly` del registro de badges (fuente
 * única del mapeo score→badge; mismos cortes que `sev`). El color lo resuelve el
 * sistema de badges vía tonos de criticidad, no aquí.
 */
export function sevValue(v: number): AnomalyValue {
  if (v >= 0.8) return 'muy';
  if (v >= 0.6) return 'anomalo';
  if (v >= 0.4) return 'algo';
  return 'leve';
}

/** Color de severidad alineado a los status ISA-101. */
export function sevColor(v: number): string {
  if (v >= 0.8) return '#da3633';
  if (v >= 0.6) return '#f85149';
  if (v >= 0.4) return '#d29922';
  return '#8b949e';
}
