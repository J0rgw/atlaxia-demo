/**
 * Informe de registro de eventos de anomalía — MODELO puro del documento.
 *
 * Construye la estructura (secciones, tablas, fichas) que renderiza
 * lib/eventReportPdf.ts a un PDF descargable. Pensado como soporte
 * documental de auditoría / notificación de incidentes (sector agua =
 * servicio esencial NIS2; CSIRT de referencia INCIBE-CERT — ver
 * docs/compliance/). En producto, este render debería moverse al BFF.
 *
 * Información que consume (toda ya disponible en el front):
 * - Filas de anomaly_events (+ gestor, abordado_at, anotaciones humanas).
 * - KPIs de franja (buildRangeInsights) y narrativas FluvIA curadas.
 * - Diccionario físico SWAT (magnitud, proceso por sensor).
 * - Metodología del detector (SPEC anomaly-event-register §4).
 */

import { format } from 'date-fns';
import { buildRangeInsights, CRIT_LABEL } from '@/lib/anomalyEventsInsights';
import { PLANT_LEVEL_CONFIG, REVIEW_STATUS_CONFIG } from '@/lib/statusStyles';
import { SWAT_DEMO_DATASET } from '@/lib/xai/data';
import { EVENT_NARRATIVES } from '@/data/fluviaNarrativesMock';
import type { AnomalyEvent } from '@/types';

export interface EventReportInput {
  installationName: string;
  generatedBy: string;
  generatedAt: number;
  rangeLabel: string;
  window: { from: number; to: number };
  events: AnomalyEvent[];
  /** Narrativa de franja curada (párrafos con **énfasis**), si existe. */
  narrative?: string[];
}

export interface ReportKV {
  k: string;
  v: string;
}

export interface ReportSheet {
  title: string;
  level: string;
  rows: ReportKV[];
  sensores: string[];
  resumen: string[];
  notas: string[];
}

export interface EventReportModel {
  title: string;
  metaLines: string[];
  classification: string;
  kpis: ReportKV[];
  executive: string[];
  inventoryHead: string[];
  inventoryRows: string[][];
  sheets: ReportSheet[];
  methodology: string[];
  footer: string;
  filename: string;
}

/** Texto plano apto para las fuentes estándar del PDF (WinAnsi). */
const pdfSafe = (s: string): string =>
  s
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/≥/g, '>=')
    .replace(/→/g, '->')
    .replace(/✓/g, 'si');

const dt = (iso: string | null): string =>
  iso ? format(new Date(iso), 'dd/MM/yyyy HH:mm:ss') : '—';
const dts = (ms: number): string => format(new Date(ms), 'dd/MM/yyyy HH:mm');

function duration(seconds: number): string {
  const s = Math.round(seconds);
  if (s < 60) return `${s} s`;
  const min = Math.floor(s / 60);
  return min < 60 ? `${min} min ${s % 60} s` : `${Math.floor(min / 60)} h ${min % 60} min`;
}

function sensorLine(id: string): string {
  const meta = SWAT_DEMO_DATASET.sensorMeta[id];
  const pk = SWAT_DEMO_DATASET.procOf[id];
  const proc = pk ? ` · ${pk} ${SWAT_DEMO_DATASET.procName[pk] ?? ''}` : '';
  return `${id} — ${meta?.desc ?? 'sensor'}${proc}`;
}

function eventSheet(e: AnomalyEvent): ReportSheet {
  const level = PLANT_LEVEL_CONFIG[e.nivel_pico] ?? PLANT_LEVEL_CONFIG[0];
  const review = REVIEW_STATUS_CONFIG[e.review_status];
  const open = e.closed_reason === null;
  const closeLabel =
    e.closed_reason === 'startup_sweep'
      ? 'cierre administrativo (sweep de arranque)'
      : open
        ? 'EN CURSO en el momento del informe'
        : 'guarda expirada';

  return {
    title: `Episodio #${e.id}`,
    level: level.name,
    rows: [
      { k: 'Detección', v: dt(e.tiempo_inicio) },
      { k: 'Fin', v: open ? '—' : dt(e.tiempo_fin) },
      { k: 'Duración', v: open ? 'en curso' : duration(e.duracion_segundos) },
      { k: 'Detecciones (nivel >= 4)', v: String(e.n_detecciones) },
      {
        k: 'Clasificación del sistema',
        v: e.posible ? 'Candidata (sub-umbral)' : 'Episodio confirmado por duración',
      },
      { k: 'Cierre', v: closeLabel },
      { k: 'Modelo', v: e.model_name },
      { k: 'Veredicto humano', v: `${review.label}${e.reviewed_at ? ` (${dt(e.reviewed_at)})` : ''}` },
      { k: 'Responsable gestor', v: e.gestor ?? 'Sin asignar' },
      { k: 'Abordado', v: dt(e.abordado_at) },
    ],
    sensores: e.sensores_involucrados.map(sensorLine),
    resumen: (EVENT_NARRATIVES[e.id] ?? []).map(pdfSafe),
    notas: e.anotaciones.map((a) => `${dt(a.created_at)} — ${a.author}: ${a.text}`),
  };
}

export function buildEventReportModel(input: EventReportInput): EventReportModel {
  const { events } = input;
  const ins = buildRangeInsights(events, input.window);
  const level = PLANT_LEVEL_CONFIG[ins.maxLevel] ?? PLANT_LEVEL_CONFIG[0];

  const executive = input.narrative
    ? input.narrative.map(pdfSafe)
    : [
        `Franja con ${ins.total} episodios registrados (${ins.confirmed} confirmados, ${ins.candidates} candidatas); ` +
          `criticidad máxima ${CRIT_LABEL[ins.crit]}. ${ins.pending} episodios permanecen sin veredicto humano.`,
      ];

  const stamp = format(new Date(input.generatedAt), 'yyyyMMdd-HHmm');
  const slug = input.installationName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  return {
    title: 'Registro de eventos de anomalía — Informe de franja',
    metaLines: [
      `Instalación: ${input.installationName}`,
      `Periodo: ${dts(input.window.from)} — ${dts(input.window.to)} (${input.rangeLabel})`,
      `Generado: ${dts(input.generatedAt)} por ${input.generatedBy} · AtlaXia`,
    ],
    classification: 'USO INTERNO · soporte a notificación de incidentes (NIS2 / INCIBE-CERT)',
    kpis: [
      { k: 'Episodios', v: String(ins.total) },
      { k: 'Confirmados', v: String(ins.confirmed) },
      { k: 'Candidatas', v: String(ins.candidates) },
      { k: 'En curso', v: String(ins.open) },
      { k: 'Sin abordar', v: String(ins.pending) },
      { k: 'T. en anomalía', v: ins.anomalySeconds > 0 ? duration(ins.anomalySeconds) : '0 s' },
      { k: 'Nivel pico', v: level.name },
    ],
    executive: [
      ...executive,
      'Resumen generado por FluvIA: descriptivo, no concluye causas ni sustituye el análisis del operador.',
    ],
    inventoryHead: ['ID', 'Detección', 'Duración', 'Nivel', 'Detec.', 'Sistema', 'Veredicto', 'Responsable'],
    inventoryRows: events.map((e) => {
      const lvl = PLANT_LEVEL_CONFIG[e.nivel_pico] ?? PLANT_LEVEL_CONFIG[0];
      return [
        `#${e.id}`,
        dt(e.tiempo_inicio),
        e.closed_reason === null ? 'en curso' : duration(e.duracion_segundos),
        lvl.name,
        String(e.n_detecciones),
        e.posible ? 'Candidata' : 'Confirmada',
        REVIEW_STATUS_CONFIG[e.review_status].label,
        e.gestor ?? '—',
      ];
    }),
    sheets: events.map(eventSheet),
    methodology: [
      'Detección mediante ensemble GNN dual (miembros STGNN_TOPK_Cont/Disc) con scoring punto a punto (1 muestra/s) y niveles de criticidad NORMAL–CRITICAL calibrados label-free sobre régimen normal.',
      'Un episodio agrupa la racha de muestras con nivel de planta >= 4: guarda de 5 s entre puntos y confirmación por duración >= 30 s (sub-umbral = candidata). Las detecciones cuentan las muestras de la racha sobre ese umbral.',
      'Los ejes sistema (clasificación automática) y humano (veredicto, responsable, anotaciones) son independientes; el veredicto del operador alimenta la recalibración del modelo.',
      'Este documento es descriptivo y de soporte: no constituye análisis forense ni atribución de causas.',
    ],
    footer: `AtlaXia · registro de eventos de anomalía · ${input.installationName}`,
    filename: `informe-anomalias_${slug || 'atlaxia'}_${stamp}.pdf`,
  };
}
