/**
 * Construcción de subgrafos del evento (XAI-graph.md §5/§6) — lógica pura.
 *
 * - frameSubgraph: top-K sensores por score del instante + vecinos linkeados
 *   de mayor score (hasta M), expandido `depth` saltos, filtrado por peso.
 * - aggregate: unión acumulativa de subgrafos frame a frame 0..uptoT
 *   (tamaño = frecuencia, color = score medio de los frames presentes,
 *   grosor = co-ocurrencia del link).
 */

import { heat } from './heat';
import type {
  Aggregate,
  FrameSubgraph,
  RenderState,
  XaiDataset,
  XaiMode,
  XaiSettings,
} from './types';

export function frameSubgraph(
  ds: XaiDataset,
  t: number,
  K: number,
  M: number,
  minW: number,
  depth: number
): FrameSubgraph {
  // guard ?? 0: un dataset real puede traer nodos sin serie de scores
  const sc = (id: string) => ds.scores[id]?.[t] ?? 0;
  // lookup O(1) de peso por par no dirigido (evita el find O(E) por vecino)
  const edgeW = new Map<string, number>();
  for (const e of ds.edges) {
    edgeW.set(`${e.s} ${e.t}`, e.w);
    edgeW.set(`${e.t} ${e.s}`, e.w);
  }
  const ranked = ds.nodes.map((n) => n.id).sort((a, b) => sc(b) - sc(a));
  const top = ranked.slice(0, K);
  const sel = new Set(top);
  let frontier = top.slice();
  for (let h = 0; h < depth; h++) {
    const next: string[] = [];
    for (const node of frontier) {
      const nb = (ds.neighbors[node] ?? [])
        .filter((x) => {
          const w = edgeW.get(`${node} ${x}`);
          return w !== undefined && w >= minW;
        })
        .sort((a, b) => sc(b) - sc(a))
        .slice(0, M);
      for (const x of nb) {
        if (!sel.has(x)) {
          sel.add(x);
          next.push(x);
        }
      }
    }
    frontier = next;
  }
  const edges = ds.edges.filter((e) => sel.has(e.s) && sel.has(e.t) && e.w >= minW);
  return { nodes: [...sel], edges, top: new Set(top) };
}

export function aggregate(
  ds: XaiDataset,
  uptoT: number,
  K: number,
  M: number,
  minW: number,
  depth: number
): Aggregate {
  const cnt: Record<string, number> = {};
  const sum: Record<string, number> = {};
  const ecnt: Record<string, number> = {};
  const first: Record<string, number> = {};
  const topc: Record<string, number> = {};
  for (let t = 0; t <= uptoT; t++) {
    const sg = frameSubgraph(ds, t, K, M, minW, depth);
    for (const id of sg.nodes) {
      cnt[id] = (cnt[id] ?? 0) + 1;
      sum[id] = (sum[id] ?? 0) + (ds.scores[id]?.[t] ?? 0);
      if (first[id] === undefined) first[id] = t;
    }
    // veces que el nodo fue PRINCIPAL (top-K del frame)
    for (const id of sg.top) topc[id] = (topc[id] ?? 0) + 1;
    for (const e of sg.edges) {
      const k = `${e.s}>${e.t}`;
      ecnt[k] = (ecnt[k] ?? 0) + 1;
    }
  }
  const nodes = Object.keys(cnt).map((id) => ({
    id,
    count: cnt[id],
    avg: sum[id] / cnt[id],
    first: first[id],
    topc: topc[id] ?? 0,
  }));
  const edges = Object.keys(ecnt).map((k) => {
    const [s, t] = k.split('>');
    return { s, t, c: ecnt[k] };
  });
  const maxc = Math.max(1, ...nodes.map((n) => n.count));
  const maxe = Math.max(1, ...edges.map((e) => e.c));
  // Top-K del evento = los K sensores que MÁS veces fueron principales.
  const top = new Set(
    [...nodes]
      .filter((n) => n.topc > 0)
      .sort((a, b) => b.topc - a.topc)
      .slice(0, K)
      .map((n) => n.id)
  );
  return { nodes, edges, maxc, maxe, top };
}

/** Estado de render del instante/acumulado actual (radio, color, etiqueta). */
export function buildRenderState(
  ds: XaiDataset,
  mode: XaiMode,
  frame: number,
  ui: XaiSettings
): RenderState {
  if (mode === 'frame') {
    const sg = frameSubgraph(ds, frame, ui.K, ui.N, ui.W, ui.D);
    const sc = (id: string) => ds.scores[id][frame];
    return {
      nodes: sg.nodes.map((id) => ({
        id,
        proc: ds.procOf[id],
        r: 7 + sc(id) * 20,
        col: heat(sc(id)),
        top: sg.top.has(id),
        val: sc(id),
        sub: `score ${sc(id).toFixed(2)}${sg.top.has(id) ? ' · TOP' : ''}`,
      })),
      edges: sg.edges.map((e) => ({ s: e.s, t: e.t, w: 1.6 + e.w * 2.0 })),
    };
  }
  const ag = aggregate(ds, frame, ui.K, ui.N, ui.W, ui.D);
  return {
    nodes: ag.nodes.map((n) => ({
      id: n.id,
      proc: ds.procOf[n.id],
      r: 8 + (n.count / ag.maxc) * 22,
      col: heat(n.avg),
      top: ag.top.has(n.id),
      val: n.avg,
      sub:
        `${n.count} frames · medio ${n.avg.toFixed(2)}` +
        (ag.top.has(n.id) ? ` · TOP (${n.topc}× principal)` : ''),
    })),
    edges: ag.edges.map((e) => ({ s: e.s, t: e.t, w: 1.4 + (e.c / ag.maxe) * 3 })),
  };
}
