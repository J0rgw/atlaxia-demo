import { describe, it, expect, beforeEach } from 'vitest';
import { buildOverview, linkifyRefs } from './overview';
import { fetchAnomalyEvents, resetAnomalyEventsStore } from '@/lib/anomalyEventsApi';
import { RANGE_NARRATIVES } from '@/data/fluviaNarrativesMock';
import type { AnomalyEventFilters } from '@/types';

const WEEK: AnomalyEventFilters = { range: '7d', posible: 'all', review_status: 'all' };

beforeEach(() => {
  resetAnomalyEventsStore();
});

describe('linkifyRefs', () => {
  it('convierte refs en texto plano a enlaces de fragmento', () => {
    expect(linkifyRefs('ver #16 y #8.')).toBe('ver [#16](#evento-16) y [#8](#evento-8).');
  });

  it('mantiene el énfasis markdown alrededor de la ref', () => {
    expect(linkifyRefs('Dar veredicto al **#16**:')).toBe('Dar veredicto al **[#16](#evento-16)**:');
  });

  it('no toca texto sin refs', () => {
    expect(linkifyRefs('sin referencias aquí')).toBe('sin referencias aquí');
  });
});

describe('buildOverview', () => {
  it('cuadra el total con los episodios del periodo', async () => {
    const { events } = await fetchAnomalyEvents(WEEK);
    const model = buildOverview(events, WEEK);
    expect(model.total).toBe(events.length);
    expect(model.insights.total).toBe(events.length);
  });

  it('reparte cada episodio en exactamente un frente, sin pérdidas ni duplicados', async () => {
    const { events } = await fetchAnomalyEvents(WEEK);
    const model = buildOverview(events, WEEK);

    const idsInFrentes = model.frentes.flatMap((f) => f.events.map((e) => e.id)).sort((a, b) => a - b);
    const idsExpected = events.map((e) => e.id).sort((a, b) => a - b);
    expect(idsInFrentes).toEqual(idsExpected);

    // cada frente tiene al menos un episodio
    for (const f of model.frentes) {
      expect(f.events.length).toBeGreaterThan(0);
    }
  });

  it('ordena cada frente «peor primero» (el nivel del primer bullet == maxLevel del frente)', async () => {
    const { events } = await fetchAnomalyEvents(WEEK);
    const model = buildOverview(events, WEEK);
    for (const f of model.frentes) {
      expect(f.events[0].level).toBe(f.maxLevel);
      const levels = f.events.map((e) => e.level);
      const sorted = [...levels].sort((a, b) => b - a);
      expect(levels).toEqual(sorted);
    }
  });

  it('el markdown del resumen es solo el lead (sin secciones por frente ni blockquote)', async () => {
    const { events } = await fetchAnomalyEvents(WEEK);
    const model = buildOverview(events, WEEK);
    expect(model.markdown).toBe(model.lead.join('\n\n'));
    expect(model.markdown).not.toContain('### ');
    expect(model.markdown).not.toContain('> ');
    expect(model.lead.length).toBeGreaterThan(0);
  });

  it('el lead curado conserva refs clicables `#evento-NN`', async () => {
    const { events } = await fetchAnomalyEvents(WEEK);
    const model = buildOverview(events, WEEK);
    expect(model.markdown).toContain('(#evento-');
  });

  it('usa la narrativa curada del preset como lead (linkificada)', async () => {
    const { events } = await fetchAnomalyEvents(WEEK);
    const model = buildOverview(events, WEEK);
    const curated = RANGE_NARRATIVES['7d']!.paragraphs.map(linkifyRefs);
    expect(model.lead).toEqual(curated);
  });

  it('el episodio «empezar por» (si lo hay) pertenece al periodo', async () => {
    const { events } = await fetchAnomalyEvents(WEEK);
    const model = buildOverview(events, WEEK);
    if (model.lookFirst?.id != null) {
      expect(events.some((e) => e.id === model.lookFirst!.id)).toBe(true);
    }
  });

  it('periodo vacío → total 0, sin frentes, sin lookFirst, markdown no vacío', () => {
    const model = buildOverview([], WEEK);
    expect(model.total).toBe(0);
    expect(model.frentes).toEqual([]);
    expect(model.lookFirst).toBeNull();
    expect(model.markdown.length).toBeGreaterThan(0);
  });
});
