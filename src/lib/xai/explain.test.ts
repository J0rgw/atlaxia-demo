import { describe, it, expect } from 'vitest';
import { connectedComponents, explainGraph, fluviaSummary, valOf } from './explain';
import { SWAT_DEMO_DATASET } from './data';
import type { XaiSettings } from './types';

const UI: XaiSettings = { K: 3, N: 5, D: 1, W: 0.1, proc: 'ring', label: 'sensor', conn: 'ai' };

describe('connectedComponents', () => {
  it('separa clusters sin conexión', () => {
    const comps = connectedComponents(
      [{ id: 'A' }, { id: 'B' }, { id: 'C' }],
      [{ s: 'A', t: 'B' }]
    );
    expect(comps).toHaveLength(2);
    expect(comps.find((c) => c.includes('A'))).toContain('B');
    expect(comps.find((c) => c.includes('C'))).toHaveLength(1);
  });
});

describe('valOf', () => {
  it('devuelve lectura con rango normal real para sensores con magnitud', () => {
    const reading = valOf(SWAT_DEMO_DATASET, 'AIT202');
    expect(reading).not.toBeNull();
    expect(reading?.valStr).toContain('pH');
    expect(reading?.normStr).toBe('normal 6.5–7.5');
  });

  it('devuelve null para actuadores sin rango (válvulas/bombas)', () => {
    expect(valOf(SWAT_DEMO_DATASET, 'MV101')).toBeNull();
    expect(valOf(SWAT_DEMO_DATASET, 'P301')).toBeNull();
  });

  it('los rangos que empiezan en 0 se formatean como cota superior', () => {
    const reading = valOf(SWAT_DEMO_DATASET, 'DPIT301');
    expect(reading?.normStr).toBe('normal < 0.4 bar');
  });
});

describe('explainGraph', () => {
  it('modo frame: foco = el más anómalo del instante, con severidad', () => {
    const info = explainGraph(SWAT_DEMO_DATASET, 'frame', 55, UI);
    expect(info.kind).toBe('frame');
    if (info.kind !== 'frame') return;
    expect(info.focus.id).toBeTruthy();
    expect(info.top.length).toBeGreaterThanOrEqual(1);
    expect(info.top.length).toBeLessThanOrEqual(3);
    expect(info.action).toContain(info.focus.id);
  });

  it('modo global: sensor clave con porcentaje de presencia coherente', () => {
    const info = explainGraph(SWAT_DEMO_DATASET, 'global', 99, UI);
    expect(info.kind).toBe('global');
    if (info.kind !== 'global') return;
    expect(info.key.count).toBeLessThanOrEqual(info.key.total);
    expect(info.key.pct).toBe(Math.round((info.key.count / info.key.total) * 100));
    expect(info.processes.length).toBeGreaterThan(0);
  });
});

describe('fluviaSummary', () => {
  it('resume el evento completo con origen y procesos', () => {
    const s = fluviaSummary(SWAT_DEMO_DATASET, UI);
    expect(s).not.toBeNull();
    if (!s) return;
    expect(s.procNames.length).toBeGreaterThan(0);
    expect(s.keyId).toBeTruthy();
    expect(SWAT_DEMO_DATASET.procOf[s.originId]).toBeTruthy();
  });

  it('el origen es una señal (sensor), no un actuador', () => {
    const s = fluviaSummary(SWAT_DEMO_DATASET, UI);
    const kind = SWAT_DEMO_DATASET.sensorMeta[s!.originId]?.kind;
    expect(['pump', 'valve', 'uv']).not.toContain(kind);
  });

  it('es estable: no depende del frame del scrub (usa el evento completo)', () => {
    const a = fluviaSummary(SWAT_DEMO_DATASET, UI);
    const b = fluviaSummary(SWAT_DEMO_DATASET, UI);
    expect(a).toEqual(b);
  });
});
