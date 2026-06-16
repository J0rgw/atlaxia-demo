/**
 * Cliente MOCK del contrato REST de anomaly_events.
 *
 * Espejo de los endpoints del SPEC (docs/handoff/anomaly-event-register/SPEC.md §7):
 *   GET   /api/anomaly-events        → fetchAnomalyEvents(filters)
 *   PATCH /api/anomaly-events/{id}   → patchAnomalyEventReview(id, review_status)
 *
 * Sirve fixtures en memoria con latencia simulada. Cuando el BFF exponga los
 * endpoints reales, basta con sustituir el cuerpo de estas dos funciones por
 * `api.get(...)` / `api.patch(...)` — las firmas y tipos no cambian.
 */

import { startOfDay, subDays } from 'date-fns';
import { seedAnomalyEvents } from '@/data/anomalyEventsMock';
import type {
  AnomalyEvent,
  AnomalyEventFilters,
  AnomalyEventsResponse,
  EventAnnotation,
  ReviewStatus,
} from '@/types';

const LATENCY_MS = 180;
const DAY_MS = 86_400_000;

let store: AnomalyEvent[] = seedAnomalyEvents();

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Restaura el store al seed inicial (solo tests). */
export function resetAnomalyEventsStore(): void {
  store = seedAnomalyEvents();
}

/**
 * Ventana temporal [from, to] en ms epoch que define el rango del filtro.
 * Compartida por API, timeline y resúmenes para que todos vean el mismo corte.
 */
export function rangeWindow(filters: AnomalyEventFilters, now: number = Date.now()): {
  from: number;
  to: number;
} {
  switch (filters.range) {
    case '24h':
      return { from: now - DAY_MS, to: now };
    case 'yesterday': {
      const start = startOfDay(subDays(new Date(now), 1)).getTime();
      return { from: start, to: start + DAY_MS };
    }
    case '7d':
      return { from: now - 7 * DAY_MS, to: now };
    case 'custom': {
      const from = filters.customFrom ? Date.parse(filters.customFrom) : now - DAY_MS;
      const to = filters.customTo ? Date.parse(filters.customTo) : now;
      // rango invertido o ilegible → último día (fail-safe, no fail-silent en UI)
      if (!Number.isFinite(from) || !Number.isFinite(to) || from >= to) {
        return { from: now - DAY_MS, to: now };
      }
      return { from, to };
    }
  }
}

export async function fetchAnomalyEvents(
  filters: AnomalyEventFilters
): Promise<AnomalyEventsResponse> {
  await delay(LATENCY_MS);
  const { from, to } = rangeWindow(filters);

  const events = store
    // semántica de SOLAPE: un episodio cuenta si toca la ventana, aunque
    // empezara antes (importa para el timeline y para episodios largos)
    .filter((e) => Date.parse(e.tiempo_fin) >= from && Date.parse(e.tiempo_inicio) <= to)
    .filter((e) =>
      filters.posible === 'all' ? true : filters.posible === 'candidate' ? e.posible : !e.posible
    )
    .filter((e) => (filters.review_status === 'all' ? true : e.review_status === filters.review_status))
    .sort((a, b) => Date.parse(b.tiempo_inicio) - Date.parse(a.tiempo_inicio));

  return { events, total: events.length };
}

/**
 * Escribe el eje HUMANO del episodio. Solo toca review_status, reviewed_by,
 * reviewed_at y updated_at — el resto de la fila es del sistema (SPEC §5).
 */
export async function patchAnomalyEventReview(
  id: number,
  review_status: ReviewStatus
): Promise<AnomalyEvent> {
  await delay(LATENCY_MS);
  const current = store.find((e) => e.id === id);
  if (!current) {
    throw new Error(`Anomaly event ${id} not found`);
  }
  const reviewed = review_status !== 'pending_review';
  const now = new Date().toISOString();
  const updated: AnomalyEvent = {
    ...current,
    review_status,
    reviewed_by: reviewed ? 1 : null,
    reviewed_at: reviewed ? now : null,
    updated_at: now,
  };
  store = store.map((e) => (e.id === id ? updated : e));
  return updated;
}

function mustFind(id: number): AnomalyEvent {
  const current = store.find((e) => e.id === id);
  if (!current) throw new Error(`Anomaly event ${id} not found`);
  return current;
}

/** Añade una anotación humana al episodio (autor + texto, fecha del sistema). */
export async function addAnomalyEventAnnotation(
  id: number,
  author: string,
  text: string
): Promise<AnomalyEvent> {
  await delay(LATENCY_MS);
  const trimmed = text.trim();
  if (!trimmed) throw new Error('Annotation text is empty');
  const current = mustFind(id);
  const now = new Date().toISOString();
  const annotation: EventAnnotation = {
    id: Math.max(0, ...store.flatMap((e) => e.anotaciones.map((a) => a.id))) + 1,
    author,
    text: trimmed,
    created_at: now,
  };
  const updated: AnomalyEvent = {
    ...current,
    anotaciones: [...current.anotaciones, annotation],
    updated_at: now,
  };
  store = store.map((e) => (e.id === id ? updated : e));
  return updated;
}

/**
 * Asigna (o retira con null) el responsable gestor. La primera asignación
 * sella abordado_at; retirar el gestor no borra la fecha de abordaje.
 */
export async function assignAnomalyEventGestor(
  id: number,
  gestor: string | null
): Promise<AnomalyEvent> {
  await delay(LATENCY_MS);
  const current = mustFind(id);
  const now = new Date().toISOString();
  const updated: AnomalyEvent = {
    ...current,
    gestor,
    abordado_at: current.abordado_at ?? (gestor ? now : null),
    updated_at: now,
  };
  store = store.map((e) => (e.id === id ? updated : e));
  return updated;
}
