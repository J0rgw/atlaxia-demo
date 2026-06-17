import { describe, it, expect, beforeEach } from 'vitest';
import { startOfDay, subDays } from 'date-fns';
import {
  addAnomalyEventAnnotation,
  assignAnomalyEventGestor,
  fetchAnomalyEvents,
  patchAnomalyEventReview,
  rangeWindow,
  resetAnomalyEventsStore,
} from './anomalyEventsApi';
import type { AnomalyEventFilters } from '@/types';

const DAY_MS = 86_400_000;
const WEEK: AnomalyEventFilters = { range: '7d', posible: 'all', review_status: 'all' };

beforeEach(() => {
  resetAnomalyEventsStore();
});

describe('rangeWindow', () => {
  const now = Date.parse('2026-06-11T10:30:00Z');

  it('24h = ventana deslizante hasta ahora', () => {
    const w = rangeWindow({ ...WEEK, range: '24h' }, now);
    expect(w.to).toBe(now);
    expect(w.to - w.from).toBe(DAY_MS);
  });

  it('yesterday = el día anterior COMPLETO (00:00–24:00 local)', () => {
    const w = rangeWindow({ ...WEEK, range: 'yesterday' }, now);
    expect(w.from).toBe(startOfDay(subDays(new Date(now), 1)).getTime());
    expect(w.to - w.from).toBe(DAY_MS);
    expect(w.to).toBeLessThanOrEqual(startOfDay(new Date(now)).getTime() + 1);
  });

  it('custom usa los límites del usuario', () => {
    const w = rangeWindow(
      {
        ...WEEK,
        range: 'custom',
        customFrom: '2026-06-01T00:00:00Z',
        customTo: '2026-06-02T00:00:00Z',
      },
      now
    );
    expect(w.from).toBe(Date.parse('2026-06-01T00:00:00Z'));
    expect(w.to).toBe(Date.parse('2026-06-02T00:00:00Z'));
  });

  it('custom invertido o ilegible cae al último día (fail-safe)', () => {
    const w = rangeWindow(
      { ...WEEK, range: 'custom', customFrom: '2026-06-05T00:00:00Z', customTo: '2026-06-01T00:00:00Z' },
      now
    );
    expect(w).toEqual({ from: now - DAY_MS, to: now });
  });
});

describe('fetchAnomalyEvents', () => {
  it('devuelve los episodios del rango ordenados por inicio descendente', async () => {
    const { events, total } = await fetchAnomalyEvents(WEEK);
    expect(total).toBe(events.length);
    expect(events.length).toBeGreaterThan(0);
    for (let i = 1; i < events.length; i++) {
      expect(Date.parse(events[i - 1].tiempo_inicio)).toBeGreaterThanOrEqual(
        Date.parse(events[i].tiempo_inicio)
      );
    }
  });

  it('filtra por SOLAPE con la ventana temporal', async () => {
    const day = await fetchAnomalyEvents({ ...WEEK, range: '24h' });
    const { from, to } = rangeWindow({ ...WEEK, range: '24h' });
    expect(day.events.length).toBeGreaterThan(0);
    for (const e of day.events) {
      expect(Date.parse(e.tiempo_fin)).toBeGreaterThanOrEqual(from);
      expect(Date.parse(e.tiempo_inicio)).toBeLessThanOrEqual(to);
    }
    const week = await fetchAnomalyEvents(WEEK);
    expect(day.total).toBeLessThan(week.total);
  });

  it('el rango custom respeta los límites del usuario', async () => {
    const now = Date.now();
    const res = await fetchAnomalyEvents({
      ...WEEK,
      range: 'custom',
      customFrom: new Date(now - 3 * DAY_MS).toISOString(),
      customTo: new Date(now - 2 * DAY_MS).toISOString(),
    });
    for (const e of res.events) {
      expect(Date.parse(e.tiempo_fin)).toBeGreaterThanOrEqual(now - 3 * DAY_MS);
      expect(Date.parse(e.tiempo_inicio)).toBeLessThanOrEqual(now - 2 * DAY_MS);
    }
  });

  it('filtra por eje sistema (posible)', async () => {
    const candidates = await fetchAnomalyEvents({ ...WEEK, posible: 'candidate' });
    expect(candidates.events.length).toBeGreaterThan(0);
    expect(candidates.events.every((e) => e.posible)).toBe(true);
    const confirmed = await fetchAnomalyEvents({ ...WEEK, posible: 'confirmed' });
    expect(confirmed.events.every((e) => !e.posible)).toBe(true);
  });

  it('filtra por eje humano (review_status)', async () => {
    const pending = await fetchAnomalyEvents({ ...WEEK, review_status: 'pending_review' });
    expect(pending.events.every((e) => e.review_status === 'pending_review')).toBe(true);
  });

  it('combina los ejes sistema + humano con semántica AND', async () => {
    const both = await fetchAnomalyEvents({
      ...WEEK,
      posible: 'candidate',
      review_status: 'pending_review',
    });
    expect(both.events.length).toBeGreaterThan(0);
    expect(both.events.every((e) => e.posible && e.review_status === 'pending_review')).toBe(true);
    // la intersección nunca devuelve más que cada eje por separado
    const onlyCandidate = await fetchAnomalyEvents({ ...WEEK, posible: 'candidate' });
    const onlyPending = await fetchAnomalyEvents({ ...WEEK, review_status: 'pending_review' });
    expect(both.total).toBeLessThanOrEqual(onlyCandidate.total);
    expect(both.total).toBeLessThanOrEqual(onlyPending.total);
  });

  it('«Todas» en ambos ejes limpia el filtro y restaura el total del rango', async () => {
    const base = await fetchAnomalyEvents(WEEK);
    const filtered = await fetchAnomalyEvents({ ...WEEK, posible: 'confirmed' });
    expect(filtered.total).toBeLessThan(base.total);
    // volver a 'all'/'all' devuelve exactamente el conteo base (el filtro se limpia)
    const cleared = await fetchAnomalyEvents({ ...WEEK, posible: 'all', review_status: 'all' });
    expect(cleared.total).toBe(base.total);
  });
});

describe('patchAnomalyEventReview', () => {
  it('escribe SOLO el eje humano: review_status + reviewed_by/at + updated_at', async () => {
    const { events } = await fetchAnomalyEvents(WEEK);
    const target = events.find((e) => e.review_status === 'pending_review')!;
    const updated = await patchAnomalyEventReview(target.id, 'confirmed_real');

    expect(updated.review_status).toBe('confirmed_real');
    expect(updated.reviewed_by).toBe(1);
    expect(updated.reviewed_at).not.toBeNull();
    // el resto de la fila es del sistema y no se toca
    expect(updated.tiempo_inicio).toBe(target.tiempo_inicio);
    expect(updated.tiempo_fin).toBe(target.tiempo_fin);
    expect(updated.posible).toBe(target.posible);
    expect(updated.nivel_pico).toBe(target.nivel_pico);
    expect(updated.n_detecciones).toBe(target.n_detecciones);
    expect(updated.inference_refs).toEqual(target.inference_refs);
  });

  it('persiste el cambio en lecturas posteriores', async () => {
    const { events } = await fetchAnomalyEvents(WEEK);
    const target = events.find((e) => e.review_status === 'pending_review')!;
    await patchAnomalyEventReview(target.id, 'dismissed_fp');
    const after = await fetchAnomalyEvents(WEEK);
    expect(after.events.find((e) => e.id === target.id)?.review_status).toBe('dismissed_fp');
  });

  it('restablecer a pendiente limpia reviewed_by/reviewed_at', async () => {
    const { events } = await fetchAnomalyEvents(WEEK);
    const reviewed = events.find((e) => e.review_status !== 'pending_review')!;
    const reset = await patchAnomalyEventReview(reviewed.id, 'pending_review');
    expect(reset.reviewed_by).toBeNull();
    expect(reset.reviewed_at).toBeNull();
  });

  it('rechaza ids inexistentes', async () => {
    await expect(patchAnomalyEventReview(99999, 'confirmed_real')).rejects.toThrow('not found');
  });
});

describe('gestión humana (anotaciones + responsable)', () => {
  it('añade una anotación con autor y fecha, sin tocar el resto de la fila', async () => {
    const { events } = await fetchAnomalyEvents(WEEK);
    const target = events[0];
    const before = target.anotaciones.length;
    const updated = await addAnomalyEventAnnotation(target.id, 'J. Pérez', 'Nota de prueba');
    expect(updated.anotaciones).toHaveLength(before + 1);
    const added = updated.anotaciones[updated.anotaciones.length - 1];
    expect(added.author).toBe('J. Pérez');
    expect(added.text).toBe('Nota de prueba');
    expect(added.created_at).toBeTruthy();
    expect(updated.review_status).toBe(target.review_status);
  });

  it('rechaza anotaciones vacías', async () => {
    const { events } = await fetchAnomalyEvents(WEEK);
    await expect(addAnomalyEventAnnotation(events[0].id, 'X', '   ')).rejects.toThrow('empty');
  });

  it('asignar responsable sella abordado_at la primera vez', async () => {
    const { events } = await fetchAnomalyEvents(WEEK);
    const target = events.find((e) => e.gestor === null && e.abordado_at === null)!;
    const updated = await assignAnomalyEventGestor(target.id, 'M. García');
    expect(updated.gestor).toBe('M. García');
    expect(updated.abordado_at).not.toBeNull();
    // retirar el gestor NO borra la fecha de abordaje
    const cleared = await assignAnomalyEventGestor(target.id, null);
    expect(cleared.gestor).toBeNull();
    expect(cleared.abordado_at).toBe(updated.abordado_at);
  });
});
