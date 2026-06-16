/**
 * Export Excel del registro de eventos de la franja — descarga directa.
 * Dos hojas: «Episodios» (tabla completa) y «Anotaciones» (trazabilidad
 * humana). SheetJS entra por import dinámico: solo se carga al exportar.
 */

import { format } from 'date-fns';
import { PLANT_LEVEL_CONFIG, REVIEW_STATUS_CONFIG } from '@/lib/statusStyles';
import type { AnomalyEvent } from '@/types';

export interface EventsWorkbookData {
  episodios: (string | number)[][];
  anotaciones: (string | number)[][];
  filename: string;
}

const dt = (iso: string | null): string =>
  iso ? format(new Date(iso), 'dd/MM/yyyy HH:mm:ss') : '';

/** Modelo puro del workbook (testeable sin tocar SheetJS). */
export function buildEventsWorkbookData(
  events: AnomalyEvent[],
  installationName: string,
  generatedAt: number
): EventsWorkbookData {
  const episodios: (string | number)[][] = [
    [
      'ID',
      'Detección',
      'Fin',
      'Duración (s)',
      'Nivel pico',
      'Detecciones (nivel >= 4)',
      'Sistema',
      'Veredicto',
      'Revisado el',
      'Responsable',
      'Abordado el',
      'Cierre',
      'Modelo',
      'Sensores involucrados',
      'Nº anotaciones',
    ],
    ...events.map((e) => [
      e.id,
      dt(e.tiempo_inicio),
      e.closed_reason === null ? 'en curso' : dt(e.tiempo_fin),
      e.duracion_segundos,
      (PLANT_LEVEL_CONFIG[e.nivel_pico] ?? PLANT_LEVEL_CONFIG[0]).name,
      e.n_detecciones,
      e.posible ? 'Candidata' : 'Confirmada',
      REVIEW_STATUS_CONFIG[e.review_status].label,
      dt(e.reviewed_at),
      e.gestor ?? '',
      dt(e.abordado_at),
      e.closed_reason ?? 'en curso',
      e.model_name,
      e.sensores_involucrados.join(', '),
      e.anotaciones.length,
    ]),
  ];

  const anotaciones: (string | number)[][] = [
    ['Episodio', 'Fecha', 'Autor', 'Anotación'],
    ...events.flatMap((e) =>
      e.anotaciones.map((a) => [e.id, dt(a.created_at), a.author, a.text])
    ),
  ];

  const stamp = format(new Date(generatedAt), 'yyyyMMdd-HHmm');
  const slug = installationName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  return {
    episodios,
    anotaciones,
    filename: `registro-anomalias_${slug || 'atlaxia'}_${stamp}.xlsx`,
  };
}

export async function downloadEventsExcel(data: EventsWorkbookData): Promise<void> {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();

  const ws = XLSX.utils.aoa_to_sheet(data.episodios);
  ws['!cols'] = [
    { wch: 5 }, { wch: 20 }, { wch: 20 }, { wch: 11 }, { wch: 10 }, { wch: 20 },
    { wch: 11 }, { wch: 15 }, { wch: 20 }, { wch: 14 }, { wch: 20 }, { wch: 14 },
    { wch: 18 }, { wch: 40 }, { wch: 14 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Episodios');

  const wsNotes = XLSX.utils.aoa_to_sheet(data.anotaciones);
  wsNotes['!cols'] = [{ wch: 9 }, { wch: 20 }, { wch: 16 }, { wch: 90 }];
  XLSX.utils.book_append_sheet(wb, wsNotes, 'Anotaciones');

  XLSX.writeFile(wb, data.filename);
}
