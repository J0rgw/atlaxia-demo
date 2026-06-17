/**
 * Mock del copiloto FluvIA: sugerencias contextuales y respuestas canned
 * (demo del futuro asistente LLM). Lógica pura, sin React.
 *
 * Reglas de voz (XAI-graph.md §10, igual que `fluviaNarrativesMock`): FluvIA
 * DESCRIBE lo observado y orienta la investigación; NUNCA concluye la causa de
 * un evento ni prescribe actuaciones sobre el proceso. Cada respuesta cierra
 * con esa nota de alcance.
 *
 * Camino de producción (comentado en `useFluviaMockRuntime`): estas funciones
 * desaparecen; el runtime pasa a `useChatRuntime` (@assistant-ui/react-ai-sdk)
 * apuntando al BFF (`streamText`, Vercel AI SDK), que recibe el mismo paquete
 * de contexto (fila del evento + scores + diccionario físico + topología).
 */

import { CRIT_LABEL } from '@/lib/anomalyEventsInsights';
import { PLANT_LEVEL_CONFIG } from '@/lib/statusStyles';
import { EVENT_NARRATIVES } from '@/data/fluviaNarrativesMock';
import type { AnomalyEvent } from '@/types';
import { fmtDuration } from '../format';
import type { OverviewModel } from './overview';

export interface FluviaSuggestion {
  id: string;
  /** Texto de la tarjeta de sugerencia. */
  label: string;
  /** Mensaje que se envía al pulsar (puede coincidir con `label`). */
  prompt: string;
}

const SCOPE_NOTE = '\n\n_FluvIA describe lo observado; no concluye causas ni actúa sobre el proceso._';

function levelName(level: number): string {
  return (PLANT_LEVEL_CONFIG[level] ?? PLANT_LEVEL_CONFIG[0]).name;
}

// ── Visión general ────────────────────────────────────────────────────────

export const OVERVIEW_SUGGESTIONS: FluviaSuggestion[] = [
  { id: 'ov-frentes', label: '¿Dónde se concentró el problema?', prompt: '¿Dónde se concentró el problema en este periodo?' },
  { id: 'ov-pending', label: '¿Qué queda sin abordar?', prompt: '¿Qué episodios quedan sin abordar?' },
  { id: 'ov-recurrent', label: '¿Hay patrones recurrentes?', prompt: '¿Hay alguna firma o sensor recurrente en el periodo?' },
];

export function overviewAnswer(prompt: string, model: OverviewModel): string {
  const p = prompt.toLowerCase();

  if (model.total === 0) {
    return 'En este periodo no hay episodios, la planta se mantuvo en régimen normal.' + SCOPE_NOTE;
  }

  if (p.includes('concentr') || p.includes('dónde') || p.includes('donde') || p.includes('frente') || p.includes('foco')) {
    const top = model.frentes[0];
    const refs = top.events.map((e) => `[#${e.id}](#evento-${e.id})`).join(', ');
    return (
      `El frente dominante es **${top.name}**, con ${top.events.length} ` +
      `episodio${top.events.length === 1 ? '' : 's'} (${refs}) y criticidad **${CRIT_LABEL[top.crit]}**. ` +
      `El resto de actividad se reparte en ${Math.max(0, model.frentes.length - 1)} frente${model.frentes.length === 2 ? '' : 's'} adicional${model.frentes.length === 2 ? '' : 'es'}.` +
      SCOPE_NOTE
    );
  }

  if (p.includes('aborda') || p.includes('pendient') || p.includes('revis') || p.includes('veredicto')) {
    const { pending } = model.insights;
    if (pending === 0) return 'Todos los episodios del periodo tienen veredicto del operador.' + SCOPE_NOTE;
    const body = model.lookFirst ? ` ${model.lookFirst.body}` : '';
    return `Quedan **${pending}** episodio${pending === 1 ? '' : 's'} sin veredicto del operador.${body}` + SCOPE_NOTE;
  }

  if (p.includes('recurrente') || p.includes('patrón') || p.includes('patron') || p.includes('firma') || p.includes('sensor')) {
    const r = model.insights.recurrentSensor;
    return r
      ? `**${r.sensor}** aparece en ${r.count} episodios, es la señal recurrente a vigilar.` + SCOPE_NOTE
      : 'No hay un sensor claramente recurrente en este periodo.' + SCOPE_NOTE;
  }

  // Por defecto: re-encamina hacia el resumen navegable.
  return (
    `Puedo describir cualquiera de los **${model.total}** episodios del periodo. ` +
    `Toca una referencia \`#NN\` del resumen o pregúntame por un frente, los pendientes o las firmas recurrentes.` +
    SCOPE_NOTE
  );
}

// ── Evento #N ───────────────────────────────────────────────────────────────

export function eventSuggestions(event: AnomalyEvent): FluviaSuggestion[] {
  return [
    { id: 'ev-what', label: '¿Qué se observó?', prompt: `¿Qué se observó en el episodio #${event.id}?` },
    { id: 'ev-signals', label: '¿Qué señales se desviaron?', prompt: '¿Qué señales se desviaron y en qué orden?' },
    { id: 'ev-severity', label: '¿Cuánto duró y qué severidad?', prompt: '¿Cuánto duró el episodio y qué severidad alcanzó?' },
  ];
}

function describeEvent(event: AnomalyEvent): string {
  const narrative = EVENT_NARRATIVES[event.id];
  if (narrative) return narrative.join('\n\n');
  const open = event.closed_reason === null;
  const first = event.sensores_involucrados[0] ?? 'sin señal registrada';
  return (
    `Episodio ${event.posible ? 'candidato (sub-umbral)' : 'confirmado'} con nivel pico **${levelName(event.nivel_pico)}**. ` +
    `La primera señal anómala fue **${first}**` +
    (event.sensores_involucrados.length > 1 ? `; después se desviaron ${event.sensores_involucrados.slice(1, 4).map((s) => `\`${s}\``).join(', ')}.` : '.') +
    (open ? ' La racha sigue en curso.' : ` Duró ${fmtDuration(event.duracion_segundos)}.`)
  );
}

export function eventAnswer(prompt: string, event: AnomalyEvent): string {
  const p = prompt.toLowerCase();
  const open = event.closed_reason === null;

  if (p.includes('señal') || p.includes('senal') || p.includes('sensor') || p.includes('variable')) {
    const signals = event.sensores_involucrados.map((s) => `\`${s}\``).join(' → ') || 'sin señales registradas';
    return `Señales implicadas, en orden de aparición: ${signals}.` + SCOPE_NOTE;
  }

  if (p.includes('cuánto') || p.includes('cuanto') || p.includes('dura') || p.includes('severidad') || p.includes('nivel')) {
    const dur = open ? 'sigue **en curso**' : `duró **${fmtDuration(event.duracion_segundos)}**`;
    return (
      `El episodio ${dur}, con **${event.n_detecciones}** detecciones y nivel pico **${levelName(event.nivel_pico)}** ` +
      `(eje sistema: ${event.posible ? 'candidata sub-umbral' : 'confirmada por duración'}).` +
      SCOPE_NOTE
    );
  }

  // «qué se observó / describe / resumen» y por defecto.
  return describeEvent(event) + SCOPE_NOTE;
}
