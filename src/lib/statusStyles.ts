/**
 * Centralized status/priority style mappings used across alert tables,
 * alarm banners, and device tables.
 */

import type { AlarmPriority } from '@/types/industrial';

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
