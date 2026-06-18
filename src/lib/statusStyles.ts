/**
 * Centralized status/priority style mappings used across alert tables,
 * alarm banners, and device tables.
 */

import type { AlarmPriority } from '@/types/industrial';
import type { ReviewStatus } from '@/types/anomalyEvents';

/** Network alert type badge styles (AlertsTable) */
export const ALERT_TYPE_STYLES: Record<string, string> = {
  Alerta: 'bg-[var(--status-warning-muted)] text-[var(--status-warning)]',
  Emergencia: 'bg-[var(--status-critical-muted)] text-[var(--status-critical)]',
  Aviso: 'bg-[var(--status-normal-muted)] text-[var(--status-normal)]',
};

/** ISA alarm priority config (AlarmBanner) */
export const ALARM_PRIORITY_CONFIG: Record<AlarmPriority, {
  bgColor: string;
  textColor: string;
  borderColor: string;
  accentBorder: string;
  icon: string;
  pulse: boolean;
}> = {
  EMERGENCY: {
    bgColor: 'bg-[var(--status-emergency-muted)]',
    textColor: 'text-[var(--status-emergency)]',
    borderColor: 'border-[var(--status-emergency)]/30',
    accentBorder: 'border-l-[6px] border-l-[var(--status-emergency)]',
    icon: '!!!',
    pulse: true,
  },
  HIGH: {
    bgColor: 'bg-[var(--status-critical-muted)]',
    textColor: 'text-[var(--status-critical)]',
    borderColor: 'border-[var(--status-critical)]/30',
    accentBorder: 'border-l-[5px] border-l-[var(--status-critical)]',
    icon: '!!',
    pulse: false,
  },
  MEDIUM: {
    bgColor: 'bg-[var(--status-warning-muted)]',
    textColor: 'text-[var(--status-warning)]',
    borderColor: 'border-[var(--status-warning)]/30',
    accentBorder: 'border-l-4 border-l-[var(--status-warning)]',
    icon: '!',
    pulse: false,
  },
  LOW: {
    bgColor: 'bg-[var(--status-advisory-muted)]',
    textColor: 'text-[var(--status-advisory)]',
    borderColor: 'border-[var(--status-advisory)]/30',
    accentBorder: 'border-l-[3px] border-l-[var(--status-advisory)]',
    icon: 'i',
    pulse: false,
  },
};

/** Device importance badge styles (DevicesTable) */
export const IMPORTANCE_STYLES: Record<string, string> = {
  Alta: 'bg-[var(--status-critical-muted)] text-[var(--status-critical)]',
  Media: 'bg-[var(--status-warning-muted)] text-[var(--status-warning)]',
  Baja: 'bg-[var(--bg-inset)] text-[var(--text-secondary)]',
};

/**
 * Criticality level 0-5 → badge styles + nombre (registro de anomaly events).
 * Mismo mapeo semántico que LEVEL_COLOR de AnomaliesTable (NORMAL/INFO →
 * normal, LOW → advisory, MEDIUM → warning, HIGH → critical, CRITICAL →
 * emergency).
 */
// Sin fondo: la severidad se lee como un readout en color (lenguaje SCADA), no
// como una pastilla. `text` tiñe la etiqueta; `dot` colorea un punto de estado.
/**
 * Mapea un nivel de planta 0-5 al eje `criticality` del registro de badges.
 * 0/1 → normal, 2 → low, 3 → medium, 4 → high, 5 → critical. Fuera de rango
 * se clampa (≤1 → normal, ≥5 → critical).
 */
export function criticalityFromLevel(
  level: number
): 'critical' | 'high' | 'medium' | 'low' | 'normal' {
  if (level >= 5) return 'critical';
  if (level === 4) return 'high';
  if (level === 3) return 'medium';
  if (level === 2) return 'low';
  return 'normal';
}

export const PLANT_LEVEL_CONFIG: Record<number, { name: string; text: string; dot: string }> = {
  0: { name: 'NORMAL', text: 'text-[var(--status-normal)]', dot: 'bg-[var(--status-normal)]' },
  1: { name: 'INFO', text: 'text-[var(--status-normal)]', dot: 'bg-[var(--status-normal)]' },
  2: { name: 'LOW', text: 'text-[var(--status-advisory)]', dot: 'bg-[var(--status-advisory)]' },
  3: { name: 'MEDIUM', text: 'text-[var(--status-warning)]', dot: 'bg-[var(--status-warning)]' },
  4: { name: 'HIGH', text: 'text-[var(--status-critical)]', dot: 'bg-[var(--status-critical)]' },
  5: { name: 'CRITICAL', text: 'text-[var(--status-emergency)]', dot: 'bg-[var(--status-emergency)]' },
};

/** Criticidad FluvIA (crit/high/mid/low) → clases del badge de los resúmenes. */
export const FLUVIA_CRIT_BADGE: Record<'crit' | 'high' | 'mid' | 'low', string> = {
  crit: 'bg-[var(--status-emergency-muted)] text-[var(--status-emergency)] border-[var(--status-emergency)]/40',
  high: 'bg-[var(--status-critical-muted)] text-[var(--status-critical)] border-[var(--status-critical)]/40',
  mid: 'bg-[var(--status-warning-muted)] text-[var(--status-warning)] border-[var(--status-warning)]/40',
  low: 'bg-[var(--bg-inset)] text-[var(--text-secondary)] border-[var(--border-default)]',
};

// review_status (eje humano del registro): punto de color + etiqueta, sin
// pastilla. «Pendiente» pide atención (ámbar), lo abordado se lee tranquilo.
export const REVIEW_STATUS_CONFIG: Record<ReviewStatus, { label: string; text: string; dot: string }> = {
  pending_review: {
    label: 'Pendiente',
    text: 'text-[var(--text-primary)] font-medium',
    dot: 'bg-[var(--status-warning)]',
  },
  confirmed_real: {
    label: 'Confirmada real',
    text: 'text-[var(--text-primary)]',
    dot: 'bg-[var(--status-critical)]',
  },
  dismissed_fp: {
    label: 'Falso positivo',
    text: 'text-[var(--text-muted)]',
    dot: 'bg-[var(--border-emphasis)]',
  },
};
