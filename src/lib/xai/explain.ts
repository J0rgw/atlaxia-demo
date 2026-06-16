/**
 * Capa de lectura del grafo — objetos estructurados (datos, no presentación).
 *
 * - explainGraph: análisis del instante (frame) o del evento (global) para el
 *   panel «Interpretación». SIEMPRE describe la lectura del modelo (IA).
 * - fluviaSummary: resumen de CIERRE del evento en datos pre-resueltos para el
 *   dock FluvIA. Deliberadamente NO infiere causas ni recomienda acciones
 *   prescriptivas (decisión de seguridad, XAI-graph.md §10).
 */

import { sev, sevColor } from './heat';
import { aggregate, frameSubgraph } from './subgraph';
import type { AggEdge, AggNode, XaiDataset, XaiMode, XaiSettings } from './types';

// --- componentes conexas (sobre aristas no dirigidas) ------------------------

export function connectedComponents(
  nodes: { id: string }[],
  edges: { s: string; t: string }[]
): string[][] {
  const adj: Record<string, string[]> = {};
  nodes.forEach((n) => (adj[n.id] = []));
  edges.forEach((e) => {
    if (adj[e.s] && adj[e.t]) {
      adj[e.s].push(e.t);
      adj[e.t].push(e.s);
    }
  });
  const seen = new Set<string>();
  const comps: string[][] = [];
  for (const n of nodes) {
    if (seen.has(n.id)) continue;
    const stack = [n.id];
    const comp: string[] = [];
    seen.add(n.id);
    while (stack.length) {
      const x = stack.pop() as string;
      comp.push(x);
      for (const y of adj[x] ?? []) {
        if (!seen.has(y)) {
          seen.add(y);
          stack.push(y);
        }
      }
    }
    comps.push(comp);
  }
  return comps;
}

// --- valor físico (sintético) en el pico de anomalía -------------------------

const MAGNITUDE_WORD: Record<string, string> = {
  ph: 'pH',
  orp: 'ORP',
  cond: 'conductividad',
  flow: 'caudal',
  level: 'nivel',
  dp: 'presión Δ',
  pressure: 'presión',
};

export interface SensorValueReading {
  valStr: string;
  normStr: string;
}

/**
 * Valor que el sensor alcanzó en el pico + su rango normal. ⚠️ El valor
 * concreto es SINTÉTICO (derivado de la intensidad); los rangos normales sí
 * son reales. Con telemetría real se sustituye por la lectura del frame de pico.
 */
export function valOf(ds: XaiDataset, id: string): SensorValueReading | null {
  const m = ds.sensorMeta[id];
  if (!m || m.nlo === undefined || m.nhi === undefined) return null;
  let best = 0;
  for (let t = 0; t < ds.nFrames; t++) {
    const s = ds.scores[id]?.[t] ?? 0;
    if (s > best) best = s;
  }
  const span = m.nhi - m.nlo || 1;
  const dir = ({ flow: -1, level: 1, dp: 1, ph: -1, orp: -1, cond: 1, pressure: 1 } as Record<string, number>)[m.kind] ?? 1;
  const val = (dir > 0 ? m.nhi : m.nlo) + dir * Math.min(1, best) * span * 1.3;
  const u = m.unit ? ` ${m.unit}` : '';
  return {
    valStr: `${MAGNITUDE_WORD[m.kind] ?? 'valor'} ${val.toFixed(m.dec ?? 1)}${u}`,
    normStr: m.nlo === 0 ? `normal < ${m.nhi}${u}` : `normal ${m.nlo}–${m.nhi}${u}`,
  };
}

// --- Interpretación (panel derecho) ------------------------------------------

export interface ExplainEmpty {
  kind: 'empty';
  message: string;
}

export interface ExplainFrame {
  kind: 'frame';
  badge: string;
  focus: { id: string; proc: string; pk: string; sev: string; col: string };
  top: { id: string; pk: string; sc: number }[];
  influence: { s: string; t: string } | null;
  action: string;
}

export interface ExplainGlobal {
  kind: 'global';
  badge: string;
  processes: { pk: string; name: string }[];
  key: { id: string; proc: string; pk: string; count: number; total: number; pct: number };
  intense: { id: string } | null;
  influences: { s: string; t: string }[];
  aparte: string[];
  action: string;
}

export type ExplainInfo = ExplainEmpty | ExplainFrame | ExplainGlobal;

export function explainGraph(
  ds: XaiDataset,
  mode: XaiMode,
  frame: number,
  ui: XaiSettings
): ExplainInfo {
  if (mode === 'frame') {
    const sg = frameSubgraph(ds, frame, ui.K, ui.N, ui.W, ui.D);
    const sc = (id: string) => ds.scores[id][frame];
    const ranked = [...sg.top].sort((a, b) => sc(b) - sc(a));
    if (!ranked.length) return { kind: 'empty', message: 'Sin sensores anómalos en este instante.' };
    const main = ranked[0];
    const inf = [...sg.edges].sort((a, b) => b.w - a.w)[0];
    return {
      kind: 'frame',
      badge: `Instante ${frame + 1} / ${ds.nFrames}`,
      focus: {
        id: main,
        proc: ds.procName[ds.procOf[main]] ?? ds.procOf[main],
        pk: ds.procOf[main],
        sev: sev(sc(main)),
        col: sevColor(sc(main)),
      },
      top: ranked.slice(0, 3).map((id) => ({ id, pk: ds.procOf[id], sc: sc(id) })),
      influence: inf ? { s: inf.s, t: inf.t } : null,
      action: `Revisa ${main}${inf && (inf.s === main || inf.t === main) ? ` y la relación ${inf.s} → ${inf.t}` : ''}.`,
    };
  }
  const ag = aggregate(ds, frame, ui.K, ui.N, ui.W, ui.D);
  if (!ag.nodes.length) return { kind: 'empty', message: 'Aún sin sensores anómalos acumulados.' };
  const total = frame + 1;
  const byFreq = [...ag.nodes].sort((a, b) => b.count - a.count);
  const byAvg = [...ag.nodes].sort((a, b) => b.avg - a.avg);
  const main = byFreq[0];
  const topEdges = [...ag.edges].sort((a, b) => b.c - a.c).slice(0, 2);
  const intense =
    byAvg[0] && byAvg[0].id !== main.id && byAvg[0].count <= main.count * 0.5 ? byAvg[0] : null;
  const comps = connectedComponents(ag.nodes, ag.edges);
  const mainComp = comps.find((c) => c.includes(main.id)) ?? [];
  const aparte = comps
    .filter((c) => c !== mainComp)
    .map((c) => {
      const rep = c
        .map((id) => ag.nodes.find((n) => n.id === id))
        .filter((n): n is AggNode => n !== undefined)
        .sort((a, b) => b.count - a.count)[0];
      return rep ? `${ds.procName[ds.procOf[rep.id]] ?? ds.procOf[rep.id]} (${rep.id})` : null;
    })
    .filter((x): x is string => x !== null);
  return {
    kind: 'global',
    badge: `Resumen · ${total} instantes`,
    processes: [...new Set(ag.nodes.map((n) => ds.procOf[n.id]))].map((pk) => ({
      pk,
      name: ds.procName[pk] ?? pk,
    })),
    key: {
      id: main.id,
      proc: ds.procName[ds.procOf[main.id]] ?? ds.procOf[main.id],
      pk: ds.procOf[main.id],
      count: main.count,
      total,
      pct: Math.round((main.count / total) * 100),
    },
    intense: intense ? { id: intense.id } : null,
    influences: topEdges.map((e: AggEdge) => ({ s: e.s, t: e.t })),
    aparte,
    action: `Empieza por ${main.id}.${topEdges[0] ? ` Vigila ${topEdges[0].s} → ${topEdges[0].t}.` : ''}`,
  };
}

// --- FluvIA · resumen de cierre ----------------------------------------------

export type FluviaCrit = 'crítica' | 'alta' | 'media' | 'baja';

export interface FluviaSummary {
  crit: FluviaCrit;
  critKey: 'crit' | 'high' | 'mid' | 'low';
  originId: string;
  originReading: SensorValueReading | null;
  originDesc: string;
  /** Señales (sensores, no actuadores) que se desviaron después del origen. */
  chain: { id: string; reading: SensorValueReading | null }[];
  procNames: string[];
  keyId: string;
}

/** Resumen del evento COMPLETO (no cambia con el scrub; solo con los controles). */
export function fluviaSummary(ds: XaiDataset, ui: XaiSettings): FluviaSummary | null {
  const ag = aggregate(ds, ds.nFrames - 1, ui.K, ui.N, ui.W, ui.D);
  if (!ag.nodes.length) return null;
  const isSensor = (id: string) => !['pump', 'valve', 'uv'].includes(ds.sensorMeta[id]?.kind ?? '');
  const comps = connectedComponents(ag.nodes, ag.edges);
  const byFreq = [...ag.nodes].sort((a, b) => b.count - a.count);
  const keyAll = byFreq[0];
  const mainSet = new Set(comps.find((c) => c.includes(keyAll.id)) ?? [keyAll.id]);
  const focus = ag.nodes.filter((n) => mainSet.has(n.id));
  const ordered = [...focus].sort((a, b) => a.first - b.first);
  const signals = ordered.filter((n) => isSensor(n.id));
  const origin = signals[0] ?? ordered[0];
  const key = byFreq.filter((n) => isSensor(n.id))[0] ?? keyAll;
  const procKeys = [...new Set(focus.map((n) => ds.procOf[n.id]))].sort();
  const maxAvg = Math.max(...ag.nodes.map((n) => n.avg));
  const crit: FluviaCrit = maxAvg >= 0.8 ? 'crítica' : maxAvg >= 0.6 ? 'alta' : maxAvg >= 0.4 ? 'media' : 'baja';
  const critKey = maxAvg >= 0.8 ? 'crit' : maxAvg >= 0.6 ? 'high' : maxAvg >= 0.4 ? 'mid' : 'low';
  // NOTA: deliberadamente NO se infiere causa (decisión de seguridad).
  return {
    crit,
    critKey,
    originId: origin.id,
    originReading: valOf(ds, origin.id),
    originDesc: ds.sensorMeta[origin.id]?.desc ?? origin.id,
    chain: signals.slice(1, 3).map((n) => ({ id: n.id, reading: valOf(ds, n.id) })),
    procNames: procKeys.map((p) => ds.procName[p] ?? p),
    keyId: key.id,
  };
}
