/**
 * Derivación del resumen FluvIA «Visión general» del periodo, lógica pura
 * (testeable, sin React).
 *
 * El documento markdown que se renderiza es SOLO el `lead` (estado global,
 * curado por preset o derivado de los insights); las refs `#NN` que contiene
 * (`[#NN](#evento-NN)`) las intercepta `FluviaMarkdown` para enfocar el
 * episodio. La agrupación por `frentes` (proceso de la primera señal) y el
 * `lookFirst` se computan igualmente, pero NO se renderizan en la vista de
 * resumen: alimentan las respuestas del chat (chatMock).
 *
 * La narrativa curada (`RANGE_NARRATIVES`) trae refs en texto plano `#NN`:
 * `linkifyRefs` las convierte al formato de enlace antes de incrustarlas.
 */

import { buildRangeInsights, processChipOf, CRIT_LABEL, type CritKey, type RangeInsights } from '@/lib/anomalyEventsInsights';
import { RANGE_NARRATIVES } from '@/data/fluviaNarrativesMock';
import { rangeWindow } from '@/lib/anomalyEventsApi';
import type { AnomalyEvent, AnomalyEventFilters, ReviewStatus } from '@/types';

const OTHER_FRENTE = { pk: '__otros__', name: 'Otras señales', color: 'var(--text-muted)' };

function critOfLevel(level: number): CritKey {
  if (level >= 5) return 'crit';
  if (level >= 4) return 'high';
  if (level >= 3) return 'mid';
  return 'low';
}

/** Convierte refs en texto plano `#NN` en enlaces de fragmento `[#NN](#evento-NN)`. */
export function linkifyRefs(text: string): string {
  return text.replace(/#(\d+)/g, '[#$1](#evento-$1)');
}

export interface OverviewEventLine {
  id: number;
  level: number;
  open: boolean;
  posible: boolean;
  reviewed: boolean;
  reviewStatus: ReviewStatus;
  firstSignal: string;
}

export interface OverviewFrente {
  pk: string;
  name: string;
  color: string;
  crit: CritKey;
  maxLevel: number;
  events: OverviewEventLine[];
}

export interface OverviewModel {
  total: number;
  insights: RangeInsights;
  /** Párrafos de narrativa de estado global (markdown, refs linkificadas). */
  lead: string[];
  /** Agrupación por frente (no se renderiza; alimenta las respuestas del chat). */
  frentes: OverviewFrente[];
  /** Triage «dónde empezar» (no se renderiza; alimenta las respuestas del chat). */
  lookFirst: { id: number | null; body: string } | null;
  /** Documento markdown del resumen = solo el lead. */
  markdown: string;
}

function eventLine(e: AnomalyEvent): OverviewEventLine {
  return {
    id: e.id,
    level: e.nivel_pico,
    open: e.closed_reason === null,
    posible: e.posible,
    reviewed: e.review_status !== 'pending_review',
    reviewStatus: e.review_status,
    firstSignal: e.sensores_involucrados[0] ?? '',
  };
}

/** Orden «peor primero» dentro de un frente: nivel desc → abierto antes → reciente antes. */
function worstFirst(a: AnomalyEvent, b: AnomalyEvent): number {
  if (b.nivel_pico !== a.nivel_pico) return b.nivel_pico - a.nivel_pico;
  const aOpen = a.closed_reason === null ? 1 : 0;
  const bOpen = b.closed_reason === null ? 1 : 0;
  if (bOpen !== aOpen) return bOpen - aOpen;
  return Date.parse(b.tiempo_inicio) - Date.parse(a.tiempo_inicio);
}

function buildFrentes(events: AnomalyEvent[]): OverviewFrente[] {
  const groups = new Map<string, AnomalyEvent[]>();
  for (const e of events) {
    const chip = processChipOf(e.sensores_involucrados[0] ?? '');
    const pk = chip?.pk ?? OTHER_FRENTE.pk;
    const bucket = groups.get(pk);
    if (bucket) bucket.push(e);
    else groups.set(pk, [e]);
  }

  const frentes: OverviewFrente[] = [];
  for (const [pk, group] of groups) {
    const sorted = [...group].sort(worstFirst);
    const chip = pk === OTHER_FRENTE.pk ? OTHER_FRENTE : processChipOf(sorted[0].sensores_involucrados[0] ?? '');
    const maxLevel = sorted.reduce((m, e) => Math.max(m, e.nivel_pico), 0);
    frentes.push({
      pk,
      name: chip?.name ?? OTHER_FRENTE.name,
      color: chip?.color ?? OTHER_FRENTE.color,
      crit: critOfLevel(maxLevel),
      maxLevel,
      events: sorted.map(eventLine),
    });
  }

  // Frentes: peor primero; «Otras señales» siempre al final.
  return frentes.sort((a, b) => {
    if (a.pk === OTHER_FRENTE.pk) return 1;
    if (b.pk === OTHER_FRENTE.pk) return -1;
    if (b.maxLevel !== a.maxLevel) return b.maxLevel - a.maxLevel;
    return a.pk.localeCompare(b.pk);
  });
}

function derivedLead(insights: RangeInsights): string[] {
  const maxRef = insights.maxLevelEventId !== null ? ` en el [#${insights.maxLevelEventId}](#evento-${insights.maxLevelEventId})` : '';
  const openClause =
    insights.open > 0 && insights.openEventId !== null
      ? ` Hay un episodio **EN CURSO** ([#${insights.openEventId}](#evento-${insights.openEventId})).`
      : '';
  const procNames = insights.processes.map((p) => p.name).join(' y ') || 'sin proceso asignado';
  const recurrent = insights.recurrentSensor
    ? `. **${insights.recurrentSensor.sensor}** aparece en ${insights.recurrentSensor.count} episodios, patrón recurrente a vigilar`
    : '';
  const pendingClause =
    insights.pending > 0 ? `**${insights.pending} episodios siguen sin abordar.**` : 'Todos los episodios están abordados.';
  return [
    `**${insights.total} episodios** en el periodo (${insights.confirmed} confirmados, ${insights.candidates} candidatas), criticidad máxima **${CRIT_LABEL[insights.crit]}**${maxRef}.${openClause}`,
    `Actividad concentrada en **${procNames}**${recurrent}. ${pendingClause}`,
  ];
}

/** Episodio de mayor valor para revisar primero: pendiente, abierto antes, peor nivel. */
function pickLookFirst(events: AnomalyEvent[]): AnomalyEvent | null {
  const pending = events.filter((e) => e.review_status === 'pending_review');
  if (pending.length === 0) return null;
  return [...pending].sort(worstFirst)[0];
}

function firstRefId(text: string): number | null {
  const m = text.match(/#(\d+)/);
  return m ? Number(m[1]) : null;
}

/**
 * Construye el modelo del resumen «Visión general» a partir de los episodios
 * del periodo y los filtros activos (para resolver la ventana del preset).
 */
export function buildOverview(events: AnomalyEvent[], filters: AnomalyEventFilters): OverviewModel {
  if (events.length === 0) {
    const insights = buildRangeInsights([], rangeWindow(filters));
    const lead = ['Sin episodios en el periodo seleccionado, la planta se mantuvo en **régimen normal**.'];
    return { total: 0, insights, lead, frentes: [], lookFirst: null, markdown: lead.join('\n\n') };
  }

  const insights = buildRangeInsights(events, rangeWindow(filters));
  const narrative = RANGE_NARRATIVES[filters.range];
  const lead = narrative ? narrative.paragraphs.map(linkifyRefs) : derivedLead(insights);
  const frentes = buildFrentes(events);

  let lookFirst: OverviewModel['lookFirst'] = null;
  if (narrative) {
    lookFirst = { id: firstRefId(narrative.lookFirst), body: linkifyRefs(narrative.lookFirst) };
  } else {
    const pick = pickLookFirst(events);
    if (pick) {
      const ref = `[#${pick.id}](#evento-${pick.id})`;
      const why = pick.closed_reason === null ? 'episodio activo, aún sin veredicto' : 'es el pendiente de mayor criticidad';
      lookFirst = { id: pick.id, body: `**Empezar por ${ref}**: ${why}.` };
    } else {
      lookFirst = { id: null, body: 'Todos los episodios están abordados, sin pendientes de veredicto.' };
    }
  }

  return { total: events.length, insights, lead, frentes, lookFirst, markdown: lead.join('\n\n') };
}
