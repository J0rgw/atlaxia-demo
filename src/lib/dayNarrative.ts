/**
 * Generador determinista de la narrativa FluvIA "del día" (demo, 100% mock).
 *
 * Emula lo que el futuro asistente LLM redactaría al recibir los eventos de una
 * jornada del calendario: un resumen descriptivo (qué se observó y dónde) y,
 * si la firma de un sensor se repite en la ventana de 7 días, una nota de
 * patrón recurrente. Bilingüe (es/en). Reutiliza las narrativas curadas
 * (EVENT_NARRATIVES, solo en español) como frase de cabecera en es.
 *
 * VOZ (misma regla que fluviaNarrativesMock): DESCRIBE física y secuencia,
 * NUNCA concluye la causa del evento ni prescribe actuaciones. `**negrita**`
 * la renderiza FluviaProse.
 */

import { format } from 'date-fns';
import { EVENT_NARRATIVES } from '@/data/fluviaNarrativesMock';
import type { Language } from '@/stores/languageStore';
import type { AnomalyEvent, CalendarDayEvents } from '@/types';

export interface DayNarrative {
  paragraphs: string[];
  /** Nota de patrón recurrente (sensor repetido en la semana) o null. */
  pattern: string | null;
}

/** Primera frase de un párrafo curado (para usarlo como one-liner). */
function firstSentence(text: string): string {
  const i = text.search(/[.!?](\s|$)/);
  return i === -1 ? text : text.slice(0, i + 1);
}

const plural = (n: number, sing: string, plur: string) => (n === 1 ? sing : plur);

/** Cadenas dependientes del idioma para la narrativa de la jornada. */
const COPY = {
  es: {
    severity: (s: number) => (s >= 0.9 ? 'crítica' : s >= 0.8 ? 'alta' : s >= 0.7 ? 'media' : 'baja'),
    noEvents: (fecha: string) => `El **${fecha}** no registró eventos destacados.`,
    summary: (fecha: string, bits: string) => `Resumen del **${fecha}**: ${bits}.`,
    anomalies: (n: number, sev: string, pct: number) =>
      `**${n} ${plural(n, 'anomalía', 'anomalías')}** de sensor (severidad pico ${sev}, ${pct}%)`,
    episodes: (n: number, confirmed: number) =>
      `**${n} ${plural(n, 'episodio', 'episodios')}**` +
      (confirmed ? ` (${confirmed} ${plural(confirmed, 'confirmado', 'confirmados')})` : ''),
    network: (netBits: string) => `en red, **${netBits}**`,
    netEmergency: (n: number) => `${n} ${plural(n, 'emergencia', 'emergencias')}`,
    netAlert: (n: number) => `${n} ${plural(n, 'alerta', 'alertas')}`,
    netNotice: (n: number) => `${n} ${plural(n, 'aviso', 'avisos')}`,
    topSensor: (s: string, n: number) =>
      `El punto de medida más recurrente de la jornada fue **${s}** (${n} ${plural(n, 'episodio', 'episodios')}).`,
    pattern: (s: string, n: number) =>
      `Patrón semanal: el sensor **${s}** aparece en **${n} episodios** de los últimos 7 días — ` +
      `firma recurrente que conviene vigilar.`,
  },
  en: {
    severity: (s: number) => (s >= 0.9 ? 'critical' : s >= 0.8 ? 'high' : s >= 0.7 ? 'medium' : 'low'),
    noEvents: (fecha: string) => `**${fecha}** recorded no notable events.`,
    summary: (fecha: string, bits: string) => `Summary for **${fecha}**: ${bits}.`,
    anomalies: (n: number, sev: string, pct: number) =>
      `**${n} sensor ${plural(n, 'anomaly', 'anomalies')}** (peak severity ${sev}, ${pct}%)`,
    episodes: (n: number, confirmed: number) =>
      `**${n} ${plural(n, 'episode', 'episodes')}**` + (confirmed ? ` (${confirmed} confirmed)` : ''),
    network: (netBits: string) => `on the network, **${netBits}**`,
    netEmergency: (n: number) => `${n} ${plural(n, 'emergency', 'emergencies')}`,
    netAlert: (n: number) => `${n} ${plural(n, 'alert', 'alerts')}`,
    netNotice: (n: number) => `${n} ${plural(n, 'notice', 'notices')}`,
    topSensor: (s: string, n: number) =>
      `The most recurrent measurement point of the day was **${s}** (${n} ${plural(n, 'episode', 'episodes')}).`,
    pattern: (s: string, n: number) =>
      `Weekly pattern: sensor **${s}** appears in **${n} episodes** over the last 7 days — ` +
      `a recurring signature worth watching.`,
  },
} as const;

export function buildDayNarrative(
  date: Date,
  dayEvents: CalendarDayEvents | null,
  dayAnomalyEvents: AnomalyEvent[],
  weekAnomalyEvents: AnomalyEvent[],
  lang: Language = 'es',
): DayNarrative {
  const c = COPY[lang];
  const paragraphs: string[] = [];

  const anomalyCount = dayEvents?.anomalyCount ?? 0;
  const emergencyCount = dayEvents?.emergencyCount ?? 0;
  const alertCount = dayEvents?.alertCount ?? 0;
  const avisoCount = dayEvents?.avisoCount ?? 0;
  const maxScore = dayEvents?.maxAnomalyScore ?? 0;
  const netTotal = emergencyCount + alertCount + avisoCount;
  const fecha = format(date, 'd/MM/yyyy');

  // 1. Línea de apertura — recuento de la jornada.
  const bits: string[] = [];
  if (anomalyCount > 0) {
    bits.push(c.anomalies(anomalyCount, c.severity(maxScore), Math.round(maxScore * 100)));
  }
  if (dayAnomalyEvents.length > 0) {
    const confirmados = dayAnomalyEvents.filter((e) => e.review_status === 'confirmed_real').length;
    bits.push(c.episodes(dayAnomalyEvents.length, confirmados));
  }
  if (netTotal > 0) {
    const netBits = [
      emergencyCount ? c.netEmergency(emergencyCount) : null,
      alertCount ? c.netAlert(alertCount) : null,
      avisoCount ? c.netNotice(avisoCount) : null,
    ]
      .filter(Boolean)
      .join(', ');
    bits.push(c.network(netBits));
  }

  paragraphs.push(bits.length === 0 ? c.noEvents(fecha) : c.summary(fecha, bits.join('; ')));

  // 2. Punto de medida dominante del día (frecuencia en episodios).
  const sensorFreq = new Map<string, number>();
  for (const ev of dayAnomalyEvents) {
    for (const s of ev.sensores_involucrados) {
      sensorFreq.set(s, (sensorFreq.get(s) ?? 0) + 1);
    }
  }
  const topSensor = [...sensorFreq.entries()].sort((a, b) => b[1] - a[1])[0];
  if (topSensor && topSensor[1] > 1) {
    paragraphs.push(c.topSensor(topSensor[0], topSensor[1]));
  }

  // 3. Reutiliza una frase curada si algún episodio del día la tiene. Las
  //    narrativas curadas son solo en español, así que únicamente en es.
  if (lang === 'es') {
    const curated = dayAnomalyEvents.map((e) => EVENT_NARRATIVES[e.id]).find((n) => n && n.length);
    if (curated) {
      paragraphs.push(firstSentence(curated[0]));
    }
  }

  // 4. Detección de patrón en la ventana de 7 días: un sensor que aparece en
  //    ≥2 episodios distintos es una firma recurrente que conviene vigilar.
  const weekSensorEpisodes = new Map<string, Set<number>>();
  for (const ev of weekAnomalyEvents) {
    for (const s of ev.sensores_involucrados) {
      if (!weekSensorEpisodes.has(s)) weekSensorEpisodes.set(s, new Set());
      weekSensorEpisodes.get(s)!.add(ev.id);
    }
  }
  const recurrent = [...weekSensorEpisodes.entries()]
    .map(([s, ids]) => [s, ids.size] as const)
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1]);

  const pattern = recurrent.length > 0 ? c.pattern(recurrent[0][0], recurrent[0][1]) : null;

  return { paragraphs, pattern };
}
