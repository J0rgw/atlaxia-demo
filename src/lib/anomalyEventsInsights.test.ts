import { describe, it, expect, beforeEach } from 'vitest';
import { buildEventInsights, buildRangeInsights } from './anomalyEventsInsights';
import { fetchAnomalyEvents, rangeWindow, resetAnomalyEventsStore } from './anomalyEventsApi';
import type { AnomalyEventFilters } from '@/types';

const WEEK: AnomalyEventFilters = { range: '7d', posible: 'all', review_status: 'all' };

beforeEach(() => {
  resetAnomalyEventsStore();
});

describe('buildRangeInsights', () => {
  it('cuadra los contadores con la lista de eventos', async () => {
    const { events } = await fetchAnomalyEvents(WEEK);
    const ins = buildRangeInsights(events, rangeWindow(WEEK));
    expect(ins.total).toBe(events.length);
    expect(ins.candidates + ins.confirmed).toBe(ins.total);
    expect(ins.pending + Math.round((ins.reviewedPct / 100) * ins.total)).toBeGreaterThanOrEqual(
      ins.total - 1 // redondeo del pct
    );
    expect(ins.confirmedReal + ins.dismissedFp + ins.pending).toBe(ins.total);
  });

  it('detecta el episodio en curso y el nivel pico máximo', async () => {
    const { events } = await fetchAnomalyEvents(WEEK);
    const ins = buildRangeInsights(events, rangeWindow(WEEK));
    const open = events.filter((e) => e.closed_reason === null);
    expect(ins.open).toBe(open.length);
    expect(ins.maxLevel).toBe(Math.max(...events.map((e) => e.nivel_pico)));
  });

  it('el tiempo en anomalía solo suma episodios confirmados', async () => {
    const { events } = await fetchAnomalyEvents(WEEK);
    const ins = buildRangeInsights(events, rangeWindow(WEEK));
    const expected = events.filter((e) => !e.posible).reduce((s, e) => s + e.duracion_segundos, 0);
    expect(ins.anomalySeconds).toBe(expected);
    expect(ins.anomalyFraction).toBeGreaterThan(0);
    expect(ins.anomalyFraction).toBeLessThanOrEqual(1);
  });

  it('franja vacía → resumen en cero sin reventar', () => {
    const ins = buildRangeInsights([], { from: 0, to: 86_400_000 });
    expect(ins.total).toBe(0);
    expect(ins.reviewedPct).toBe(0);
    expect(ins.topSensors).toEqual([]);
    expect(ins.maxLevelEventId).toBeNull();
  });
});

describe('buildEventInsights', () => {
  it('extrae primera señal, resto y procesos del episodio', async () => {
    const { events } = await fetchAnomalyEvents(WEEK);
    const event = events.find((e) => e.sensores_involucrados.length >= 3)!;
    const ins = buildEventInsights(event);
    expect(ins.firstSignal).toBe(event.sensores_involucrados[0]);
    expect(ins.otherSignals.length).toBeGreaterThan(0);
    expect(ins.processes.length).toBeGreaterThan(0);
    expect(ins.reviewed).toBe(event.review_status !== 'pending_review');
  });
});
