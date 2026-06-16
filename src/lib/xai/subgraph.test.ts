import { describe, it, expect } from 'vitest';
import { aggregate, buildRenderState, frameSubgraph } from './subgraph';
import { SWAT_DEMO_DATASET } from './data';
import type { XaiDataset, XaiSettings } from './types';

/**
 * Dataset mínimo controlado: A→B (0.8), B→C (0.5), C→D (0.2).
 * Scores por frame elegidos para que el principal sea A (t0), B (t1), B (t2).
 */
function tinyDataset(): XaiDataset {
  const nodes = [
    { id: 'A', proc: 'P1' },
    { id: 'B', proc: 'P1' },
    { id: 'C', proc: 'P2' },
    { id: 'D', proc: 'P2' },
  ];
  const edges = [
    { s: 'A', t: 'B', w: 0.8 },
    { s: 'B', t: 'C', w: 0.5 },
    { s: 'C', t: 'D', w: 0.2 },
  ];
  return {
    nodes,
    edges,
    phys: [],
    procOf: { A: 'P1', B: 'P1', C: 'P2', D: 'P2' },
    procColor: { P1: '#79c0ff', P2: '#bc8cff' },
    procName: { P1: 'uno', P2: 'dos' },
    sensorMeta: {},
    equip: {},
    neighbors: { A: ['B'], B: ['A', 'C'], C: ['B', 'D'], D: ['C'] },
    nFrames: 3,
    scores: {
      A: [0.9, 0.1, 0.1],
      B: [0.5, 0.9, 0.95],
      C: [0.2, 0.5, 0.9],
      D: [0.1, 0.2, 0.3],
    },
  };
}

describe('frameSubgraph', () => {
  it('selecciona el top-K por score del frame', () => {
    const ds = tinyDataset();
    const sg = frameSubgraph(ds, 0, 1, 5, 0.1, 1);
    expect([...sg.top]).toEqual(['A']);
  });

  it('expande a los vecinos linkeados con peso suficiente', () => {
    const ds = tinyDataset();
    const sg = frameSubgraph(ds, 0, 1, 5, 0.1, 1);
    expect(sg.nodes.sort()).toEqual(['A', 'B']);
    expect(sg.edges).toEqual([{ s: 'A', t: 'B', w: 0.8 }]);
  });

  it('respeta el peso mínimo de arista en la expansión', () => {
    const ds = tinyDataset();
    // C es principal en... usamos t2 con K=1 → top B; vecino C (0.5) pasa con
    // minW 0.4, pero D (0.2 desde C) no entraría ni con profundidad 2.
    const sg = frameSubgraph(ds, 2, 1, 5, 0.4, 2);
    expect(sg.nodes.sort()).toEqual(['A', 'B', 'C']);
    expect(sg.nodes).not.toContain('D');
  });

  it('la profundidad limita los saltos de expansión', () => {
    const ds = tinyDataset();
    const oneHop = frameSubgraph(ds, 2, 1, 5, 0.1, 1);
    const twoHops = frameSubgraph(ds, 2, 1, 5, 0.1, 2);
    expect(oneHop.nodes.sort()).toEqual(['A', 'B', 'C']);
    expect(twoHops.nodes.sort()).toEqual(['A', 'B', 'C', 'D']);
  });

  it('limita los vecinos por nodo a M, priorizando por score', () => {
    const ds = tinyDataset();
    // B principal en t1; vecinos A (0.1) y C (0.5) → con M=1 solo C.
    const sg = frameSubgraph(ds, 1, 1, 1, 0.1, 1);
    expect(sg.nodes.sort()).toEqual(['B', 'C']);
  });
});

describe('aggregate', () => {
  it('acumula frecuencia y media SOLO sobre los frames presentes', () => {
    const ds = tinyDataset();
    const ag = aggregate(ds, 2, 1, 5, 0.1, 1);
    // C aparece en t1 y t2 (vecino de B): media sobre ESOS frames = (0.5+0.9)/2,
    // no la media global de los 3 frames (≈0.53). Es la regla del §6.
    const c = ag.nodes.find((n) => n.id === 'C');
    expect(c?.count).toBe(2);
    expect(c?.avg).toBeCloseTo(0.7);
    const b = ag.nodes.find((n) => n.id === 'B');
    expect(b?.count).toBe(3); // vecino en t0, principal en t1 y t2
  });

  it('el top-K global es el que MÁS veces fue principal', () => {
    const ds = tinyDataset();
    const ag = aggregate(ds, 2, 1, 5, 0.1, 1);
    // principales: t0=A, t1=B, t2=B → B con topc=2
    expect([...ag.top]).toEqual(['B']);
    expect(ag.nodes.find((n) => n.id === 'B')?.topc).toBe(2);
  });

  it('cuenta la co-ocurrencia de cada link', () => {
    const ds = tinyDataset();
    const ag = aggregate(ds, 2, 1, 5, 0.1, 1);
    const ab = ag.edges.find((e) => e.s === 'A' && e.t === 'B');
    expect(ab?.c).toBeGreaterThanOrEqual(1);
  });

  it('registra el primer frame de aparición (first)', () => {
    const ds = tinyDataset();
    const ag = aggregate(ds, 2, 1, 5, 0.1, 1);
    expect(ag.nodes.find((n) => n.id === 'A')?.first).toBe(0);
    expect(ag.nodes.find((n) => n.id === 'C')?.first).toBe(1);
  });
});

describe('buildRenderState', () => {
  const ui: XaiSettings = { K: 3, N: 5, D: 1, W: 0.1, proc: 'ring', label: 'sensor', conn: 'ai' };

  it('modo frame: radio y etiqueta derivados del score del instante', () => {
    const state = buildRenderState(SWAT_DEMO_DATASET, 'frame', 55, ui);
    expect(state.nodes.length).toBeGreaterThan(0);
    for (const n of state.nodes) {
      expect(n.r).toBeGreaterThanOrEqual(7);
      expect(n.r).toBeLessThanOrEqual(27);
      expect(n.sub).toContain('score');
    }
    expect(state.nodes.filter((n) => n.top).length).toBeLessThanOrEqual(ui.K);
  });

  it('modo global: tamaño por frecuencia y media de los frames presentes', () => {
    const state = buildRenderState(SWAT_DEMO_DATASET, 'global', 99, ui);
    expect(state.nodes.length).toBeGreaterThan(0);
    for (const n of state.nodes) {
      expect(n.sub).toMatch(/\d+ frames · medio/);
    }
  });
});
