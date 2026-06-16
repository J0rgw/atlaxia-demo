/** Formateo de fechas/duraciones del registro de eventos (readouts mono). */

import { format } from 'date-fns';

export function fmtDateTime(iso: string): string {
  return format(new Date(iso), 'dd/MM/yyyy HH:mm:ss');
}

export function fmtTimeShort(iso: string): string {
  return format(new Date(iso), 'dd/MM HH:mm:ss');
}

export function fmtDuration(seconds: number): string {
  const s = Math.round(seconds); // el BFF real puede emitir fracciones (EXTRACT EPOCH)
  if (s < 60) return `${s} s`;
  const min = Math.floor(s / 60);
  const rest = s % 60;
  if (min < 60) return rest > 0 ? `${min} min ${rest} s` : `${min} min`;
  const h = Math.floor(min / 60);
  return `${h} h ${min % 60} min`;
}
