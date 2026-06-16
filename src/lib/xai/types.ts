/**
 * Tipos del grafo XAI (explicabilidad de eventos de anomalía).
 * Port tipado del prototipo docs/xai-graph/prototype-focus.html.
 */

export type XaiMode = 'global' | 'frame';
export type ProcStyle = 'ring' | 'lazo' | 'off';
export type LabelStyle = 'sensor' | 'equip';
export type ConnMode = 'ai' | 'phys' | 'both';

/** Controles vivos del subgrafo (§5/§8 de docs/xai-graph/XAI-graph.md). */
export interface XaiSettings {
  /** top-K sensores principales por score. */
  K: number;
  /** vecinos linkeados por nodo principal. */
  N: number;
  /** profundidad de expansión en saltos. */
  D: number;
  /** peso mínimo de arista (0..0.6). */
  W: number;
  proc: ProcStyle;
  label: LabelStyle;
  conn: ConnMode;
}

export interface XaiNodeDef {
  id: string;
  proc: string;
}

/** Arista inferida por el modelo: dirigida y ponderada. */
export interface XaiEdge {
  s: string;
  t: string;
  w: number;
}

export interface SensorMeta {
  kind: string;
  desc: string;
  unit?: string;
  /** Rango normal (si el sensor mide una magnitud). */
  nlo?: number;
  nhi?: number;
  dec?: number;
}

/**
 * Dataset completo del grafo. El demo sintético (SWAT_DEMO_DATASET) es el
 * swap point: el producto real lo construirá desde la adyacencia del
 * checkpoint + scores por replay de la ventana del evento (XAI-graph.md §3/§7).
 */
export interface XaiDataset {
  nodes: XaiNodeDef[];
  edges: XaiEdge[];
  /** Red FÍSICA real [origen, destino] — capa separada del grafo inferido (§11). */
  phys: [string, string][];
  procOf: Record<string, string>;
  procColor: Record<string, string>;
  procName: Record<string, string>;
  sensorMeta: Record<string, SensorMeta>;
  /** sensor → equipo observado (el sensor no es la entidad, §11.2). */
  equip: Record<string, string>;
  /** Vecindad no dirigida para la expansión del subgrafo. */
  neighbors: Record<string, string[]>;
  /** Nº de frames del evento. */
  nFrames: number;
  /** Score de anomalía por sensor y frame (0..1). */
  scores: Record<string, number[]>;
}

export interface FrameSubgraph {
  nodes: string[];
  edges: XaiEdge[];
  top: Set<string>;
}

export interface AggNode {
  id: string;
  count: number;
  avg: number;
  first: number;
  topc: number;
}

export interface AggEdge {
  s: string;
  t: string;
  c: number;
}

export interface Aggregate {
  nodes: AggNode[];
  edges: AggEdge[];
  maxc: number;
  maxe: number;
  top: Set<string>;
}

/** Nodo listo para pintar (frame o agregado, ya con radio/color/etiqueta). */
export interface RenderNode {
  id: string;
  proc: string;
  r: number;
  col: string;
  top: boolean;
  val: number;
  sub: string;
}

export interface RenderEdge {
  s: string;
  t: string;
  w: number;
}

export interface RenderState {
  nodes: RenderNode[];
  edges: RenderEdge[];
}

/** Información de hover que el engine reporta a React (tooltip). */
export interface XaiHoverInfo {
  id: string;
  proc: string;
  equip: string | null;
  sub: string;
  val: number;
  /** Posición del cursor relativa al canvas (px CSS). */
  x: number;
  y: number;
}
