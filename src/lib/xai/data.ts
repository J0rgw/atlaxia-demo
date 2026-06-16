/**
 * Dataset DEMO del grafo XAI — datos sintéticos con narrativa (blip P1 suelto
 * al inicio; foco AIT202↔LIT301 + spike de DPIT301 en el pico del evento).
 *
 * Qué es mock y qué será real en producto (XAI-graph.md §9):
 * - Adyacencia: aquí hand-defined; real = recompute del checkpoint (model.gc).
 * - Scores por frame: aquí gaussianas; real = replay de la ventana del evento.
 * - Ventana: aquí 100 frames fijos; real = rango de anomaly_events.
 * - Sensores: 17 SWAT de muestra; real = DeviceImport.csv del scope.
 */

import type { SensorMeta, XaiDataset, XaiEdge, XaiNodeDef } from './types';

/** Paleta de series del Design System SCADA (design.md §7.1) por proceso. */
const PROC_COLOR: Record<string, string> = {
  P1: '#79c0ff',
  P2: '#bc8cff',
  P3: '#3fb950',
  P4: '#f0883e',
  P5: '#58a6ff',
  P6: '#f778ba',
};

const PROC_NAME: Record<string, string> = {
  P1: 'agua cruda',
  P2: 'dosificación química',
  P3: 'ultrafiltración',
  P4: 'decloración UV',
  P5: 'ósmosis inversa',
  P6: 'almacenamiento',
};

const NODES: XaiNodeDef[] = (
  [
    ['FIT101', 'P1'], ['LIT101', 'P1'], ['MV101', 'P1'], ['P101', 'P1'],
    ['AIT201', 'P2'], ['AIT202', 'P2'], ['AIT203', 'P2'], ['FIT201', 'P2'], ['MV201', 'P2'], ['P201', 'P2'],
    ['DPIT301', 'P3'], ['FIT301', 'P3'], ['LIT301', 'P3'], ['MV301', 'P3'], ['P301', 'P3'],
    ['AIT401', 'P4'], ['FIT401', 'P4'],
  ] as const
).map(([id, proc]) => ({ id, proc }));

const SENSOR_META: Record<string, SensorMeta> = {
  FIT101: { kind: 'flow', desc: 'caudal de entrada de agua cruda', unit: 'm³/h', nlo: 2.0, nhi: 3.0, dec: 2 },
  LIT101: { kind: 'level', desc: 'nivel del tanque de agua cruda (T101)', unit: 'mm', nlo: 500, nhi: 820, dec: 0 },
  MV101: { kind: 'valve', desc: 'válvula de entrada de agua cruda' },
  P101: { kind: 'pump', desc: 'bomba principal hacia dosificación' },
  AIT201: { kind: 'cond', desc: 'conductividad (dosis de NaCl)', unit: 'µS/cm', nlo: 250, nhi: 550, dec: 0 },
  AIT202: { kind: 'ph', desc: 'pH (dosis de HCl)', unit: '', nlo: 6.5, nhi: 7.5, dec: 1 },
  AIT203: { kind: 'orp', desc: 'ORP / cloro libre (dosis de NaOCl)', unit: 'mV', nlo: 650, nhi: 750, dec: 0 },
  FIT201: { kind: 'flow', desc: 'caudal tras la dosificación', unit: 'm³/h', nlo: 2.0, nhi: 3.0, dec: 2 },
  MV201: { kind: 'valve', desc: 'válvula de salida hacia UF' },
  P201: { kind: 'pump', desc: 'bomba dosificadora de NaCl' },
  DPIT301: { kind: 'dp', desc: 'presión diferencial de la membrana de UF', unit: 'bar', nlo: 0, nhi: 0.4, dec: 2 },
  FIT301: { kind: 'flow', desc: 'caudal de ultrafiltración', unit: 'm³/h', nlo: 1.5, nhi: 2.5, dec: 2 },
  LIT301: { kind: 'level', desc: 'nivel del tanque de UF (T301)', unit: 'mm', nlo: 500, nhi: 1000, dec: 0 },
  MV301: { kind: 'valve', desc: 'válvula de retrolavado de UF' },
  P301: { kind: 'pump', desc: 'bomba de ultrafiltración' },
  AIT401: { kind: 'orp', desc: 'dureza del agua tras decloración' },
  FIT401: { kind: 'flow', desc: 'caudal hacia la unidad UV/RO', unit: 'm³/h', nlo: 0.5, nhi: 1.5, dec: 2 },
};

/** sensor → EQUIPO observado, de plant_survey + metadata SWaT (XAI-graph.md §11). */
const EQUIP: Record<string, string> = {
  FIT101: 'Caudalímetro FIT101', LIT101: 'Tanque T-101', MV101: 'Válvula MV101', P101: 'Bomba P101',
  AIT201: 'Dosif. NaCl', AIT202: 'Dosif. HCl', AIT203: 'Dosif. NaOCl',
  FIT201: 'Caudalímetro FIT201', MV201: 'Válvula MV201', P201: 'Bomba P201',
  DPIT301: 'Membrana UF', FIT301: 'Caudalímetro FIT301', LIT301: 'Tanque T-301',
  MV301: 'Válvula MV301', P301: 'Bomba P301', AIT401: 'Analizador AIT401', FIT401: 'Caudalímetro FIT401',
};

/**
 * Red FÍSICA real (intra + inter proceso), derivada de affects/affectedBy del
 * metadata SWaT, resolviendo equipo→sensor observador. P4 queda aislado: sin
 * enlace en el metadata (el handoff físico pasa por T401, que no es nodo).
 */
const PHYS: [string, string][] = [
  ['MV101', 'LIT101'],
  ['MV101', 'FIT101'],
  ['LIT101', 'P101'],
  ['P101', 'FIT201'],
  ['P201', 'FIT201'],
  ['FIT201', 'AIT201'],
  ['MV201', 'LIT301'],
  ['LIT301', 'P301'],
  ['P301', 'FIT301'],
  ['P301', 'DPIT301'],
  ['P301', 'MV301'],
  ['MV301', 'DPIT301'],
];

/** Adyacencia aprendida (dirigida, ponderada) — fija para todo el evento. */
const EDGES: XaiEdge[] = (
  [
    ['LIT101', 'FIT101', 0.7], ['LIT101', 'MV101', 0.5], ['FIT101', 'P101', 0.4], ['MV101', 'P101', 0.3],
    ['AIT202', 'LIT301', 0.8], ['AIT202', 'AIT203', 0.6], ['AIT202', 'MV201', 0.55], ['AIT202', 'FIT201', 0.5],
    ['AIT203', 'AIT201', 0.4], ['MV201', 'P201', 0.45], ['FIT201', 'P201', 0.3], ['AIT201', 'AIT202', 0.35],
    ['MV201', 'LIT301', 0.4],
    ['LIT301', 'DPIT301', 0.7], ['LIT301', 'MV301', 0.4], ['DPIT301', 'MV301', 0.45], ['DPIT301', 'P301', 0.4],
    ['MV301', 'P301', 0.3], ['FIT301', 'LIT301', 0.35],
    ['AIT401', 'FIT401', 0.3],
  ] as const
).map(([s, t, w]) => ({ s, t, w }));

const N_FRAMES = 100;

const bump = (t: number, c: number, wd: number, a: number) =>
  a * Math.exp(-((t - c) ** 2) / (2 * wd * wd));

function hash(s: string): number {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 97;
  return h;
}

function scoreOf(id: string, t: number): number {
  const base = 0.07 + 0.04 * Math.sin(t * 0.28 + hash(id));
  const add: Record<string, number> = {
    AIT202: bump(t, 55, 16, 0.85),
    LIT301: bump(t, 58, 15, 0.78),
    MV201: bump(t, 52, 18, 0.5),
    AIT203: bump(t, 50, 14, 0.45),
    FIT201: bump(t, 60, 14, 0.4),
    AIT201: bump(t, 57, 15, 0.3),
    DPIT301: bump(t, 49, 3, 0.95) + bump(t, 49, 16, 0.25),
    MV301: bump(t, 56, 16, 0.3),
    P301: bump(t, 58, 14, 0.2),
    LIT101: bump(t, 14, 5, 0.6),
    FIT101: bump(t, 15, 6, 0.42),
    MV101: bump(t, 16, 6, 0.3),
  };
  return Math.max(0, Math.min(1, base + (add[id] ?? 0)));
}

function buildNeighbors(nodes: XaiNodeDef[], edges: XaiEdge[]): Record<string, string[]> {
  const sets: Record<string, Set<string>> = {};
  nodes.forEach((n) => (sets[n.id] = new Set()));
  edges.forEach((e) => {
    sets[e.s].add(e.t);
    sets[e.t].add(e.s);
  });
  return Object.fromEntries(Object.entries(sets).map(([id, set]) => [id, [...set]]));
}

export const SWAT_DEMO_DATASET: XaiDataset = {
  nodes: NODES,
  edges: EDGES,
  phys: PHYS,
  procOf: Object.fromEntries(NODES.map((n) => [n.id, n.proc])),
  procColor: PROC_COLOR,
  procName: PROC_NAME,
  sensorMeta: SENSOR_META,
  equip: EQUIP,
  neighbors: buildNeighbors(NODES, EDGES),
  nFrames: N_FRAMES,
  scores: Object.fromEntries(
    NODES.map((n) => [n.id, Array.from({ length: N_FRAMES }, (_, t) => scoreOf(n.id, t))])
  ),
};
