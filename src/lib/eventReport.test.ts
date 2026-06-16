import { describe, it, expect, beforeEach } from 'vitest';
import { buildEventReportModel } from './eventReport';
import { buildEventsWorkbookData } from './eventExportXlsx';
import { fetchAnomalyEvents, rangeWindow, resetAnomalyEventsStore } from './anomalyEventsApi';
import type { AnomalyEventFilters } from '@/types';

const WEEK: AnomalyEventFilters = { range: '7d', posible: 'all', review_status: 'all' };

beforeEach(() => {
  resetAnomalyEventsStore();
});

async function buildModel() {
  const { events } = await fetchAnomalyEvents(WEEK);
  return {
    events,
    model: buildEventReportModel({
      installationName: 'Planta SWAT',
      generatedBy: 'auditor',
      generatedAt: Date.parse('2026-06-12T10:00:00Z'),
      rangeLabel: '7 días',
      window: rangeWindow(WEEK),
      events,
      narrative: ['La semana deja **once registros** con nivel ≥ 4.'],
    }),
  };
}

describe('buildEventReportModel', () => {
  it('estructura completa: cabecera, KPIs, inventario, fichas y metodología', async () => {
    const { events, model } = await buildModel();
    expect(model.metaLines[0]).toContain('Planta SWAT');
    expect(model.classification).toContain('INCIBE-CERT');
    expect(model.kpis.find((k) => k.k === 'Episodios')?.v).toBe(String(events.length));
    expect(model.inventoryRows).toHaveLength(events.length);
    expect(model.sheets).toHaveLength(events.length);
    expect(model.methodology.length).toBeGreaterThan(2);
  });

  it('sanea el texto para las fuentes del PDF (sin ** ni símbolos fuera de WinAnsi)', async () => {
    const { model } = await buildModel();
    expect(model.executive[0]).toBe('La semana deja once registros con nivel >= 4.');
    const all = JSON.stringify(model);
    expect(all).not.toContain('**');
  });

  it('la ficha vuelca gestión humana: veredicto, responsable, abordaje y anotaciones', async () => {
    const { model } = await buildModel();
    const sheet14 = model.sheets.find((s) => s.title === 'Episodio #14')!;
    expect(sheet14.rows.find((r) => r.k === 'Responsable gestor')?.v).toBe('J. Pérez');
    expect(sheet14.rows.find((r) => r.k === 'Abordado')?.v).not.toBe('—');
    expect(sheet14.notas.length).toBeGreaterThanOrEqual(2);
    expect(sheet14.notas[0]).toContain('J. Pérez');
  });

  it('describe los sensores con su significado físico y proceso', async () => {
    const { model } = await buildModel();
    const sheet14 = model.sheets.find((s) => s.title === 'Episodio #14')!;
    expect(sheet14.sensores.some((s) => s.includes('LIT101') && s.includes('nivel'))).toBe(true);
    expect(sheet14.sensores.some((s) => s.includes('P1'))).toBe(true);
  });

  it('genera un filename con slug e instantánea temporal', async () => {
    const { model } = await buildModel();
    expect(model.filename).toMatch(/^informe-anomalias_planta-swat_\d{8}-\d{4}\.pdf$/);
  });
});

describe('buildEventsWorkbookData', () => {
  it('hoja de episodios: cabecera + una fila por evento', async () => {
    const { events } = await fetchAnomalyEvents(WEEK);
    const wb = buildEventsWorkbookData(events, 'Planta SWAT', Date.now());
    expect(wb.episodios).toHaveLength(events.length + 1);
    expect(wb.episodios[0]).toContain('Responsable');
    const row14 = wb.episodios.find((r) => r[0] === 14)!;
    expect(row14).toContain('J. Pérez');
  });

  it('hoja de anotaciones: una fila por nota con episodio y autor', async () => {
    const { events } = await fetchAnomalyEvents(WEEK);
    const wb = buildEventsWorkbookData(events, 'Planta SWAT', Date.now());
    const totalNotes = events.reduce((s, e) => s + e.anotaciones.length, 0);
    expect(wb.anotaciones).toHaveLength(totalNotes + 1);
    expect(wb.filename).toMatch(/\.xlsx$/);
  });
});
