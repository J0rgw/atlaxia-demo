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
export const PLANT_LEVEL_CONFIG: Record<number, { name: string; badge: string }> = {
  0: { name: 'NORMAL', badge: 'bg-[var(--status-normal-muted)] text-[var(--status-normal)]' },
  1: { name: 'INFO', badge: 'bg-[var(--status-normal-muted)] text-[var(--status-normal)]' },
  2: { name: 'LOW', badge: 'bg-[var(--status-advisory-muted)] text-[var(--status-advisory)]' },
  3: { name: 'MEDIUM', badge: 'bg-[var(--status-warning-muted)] text-[var(--status-warning)]' },
  4: { name: 'HIGH', badge: 'bg-[var(--status-critical-muted)] text-[var(--status-critical)]' },
  5: { name: 'CRITICAL', badge: 'bg-[var(--status-emergency-muted)] text-[var(--status-emergency)]' },
};

/** Criticidad FluvIA (crit/high/mid/low) → clases del badge de los resúmenes. */
export const FLUVIA_CRIT_BADGE: Record<'crit' | 'high' | 'mid' | 'low', string> = {
  crit: 'bg-[var(--status-emergency-muted)] text-[var(--status-emergency)] border-[var(--status-emergency)]/40',
  high: 'bg-[var(--status-critical-muted)] text-[var(--status-critical)] border-[var(--status-critical)]/40',
  mid: 'bg-[var(--status-warning-muted)] text-[var(--status-warning)] border-[var(--status-warning)]/40',
  low: 'bg-[var(--bg-inset)] text-[var(--text-secondary)] border-[var(--border-default)]',
};

/** review_status (eje humano del registro de eventos) → badge + etiqueta. */
export const REVIEW_STATUS_CONFIG: Record<ReviewStatus, { label: string; badge: string }> = {
  pending_review: {
    label: 'Pendiente',
    badge: 'bg-[var(--status-warning-muted)] text-[var(--status-warning)]',
  },
  confirmed_real: {
    label: 'Confirmada real',
    badge: 'bg-[var(--status-critical-muted)] text-[var(--status-critical)]',
  },
  dismissed_fp: {
    label: 'Falso positivo',
    badge: 'bg-[var(--bg-inset)] text-[var(--text-secondary)]',
  },
};
