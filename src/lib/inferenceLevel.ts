import type { LevelName } from '@/types/inference';
import type { KPIData } from '@/types';

export const LEVEL_NAME_BY_INT: Record<number, LevelName> = {
  [-1]: 'UNKNOWN',
  0: 'NORMAL',
  1: 'INFO',
  2: 'LOW',
  3: 'MEDIUM',
  4: 'HIGH',
  5: 'CRITICAL',
};

const LEVEL_INT_BY_NAME: Record<LevelName, number> = {
  UNKNOWN: -1,
  NORMAL: 0,
  INFO: 1,
  LOW: 2,
  MEDIUM: 3,
  HIGH: 4,
  CRITICAL: 5,
};

export function levelInt(name: LevelName): number {
  return LEVEL_INT_BY_NAME[name] ?? -1;
}

export function clampLevel(level: number): number {
  if (!Number.isFinite(level)) return -1;
  return Math.max(-1, Math.min(5, Math.trunc(level)));
}

const STATUS_TOKEN_BY_LEVEL: Record<number, string> = {
  [-1]: 'var(--text-muted)',
  0: 'var(--status-normal)',
  1: 'var(--status-normal)',
  2: 'var(--status-advisory)',
  3: 'var(--status-warning)',
  4: 'var(--status-critical)',
  5: 'var(--status-emergency)',
};

const STATUS_MUTED_TOKEN_BY_LEVEL: Record<number, string> = {
  [-1]: 'var(--bg-inset)',
  0: 'var(--status-normal-muted)',
  1: 'var(--status-normal-muted)',
  2: 'var(--status-advisory-muted)',
  3: 'var(--status-warning-muted)',
  4: 'var(--status-critical-muted)',
  5: 'var(--status-emergency-muted)',
};

export function levelToStatusToken(level: number): string {
  return STATUS_TOKEN_BY_LEVEL[clampLevel(level)] ?? STATUS_TOKEN_BY_LEVEL[-1];
}

export function levelToStatusMutedToken(level: number): string {
  return STATUS_MUTED_TOKEN_BY_LEVEL[clampLevel(level)] ?? STATUS_MUTED_TOKEN_BY_LEVEL[-1];
}

const KPI_VARIANT_BY_LEVEL: Record<number, KPIData['variant']> = {
  [-1]: 'neutral',
  0: 'teal',
  1: 'sky',
  2: 'teal',
  3: 'warning',
  4: 'critical',
  5: 'critical',
};

export function levelToVariant(level: number): KPIData['variant'] {
  return KPI_VARIANT_BY_LEVEL[clampLevel(level)] ?? 'neutral';
}

/** Fraction (0..1) of the 5 active segments lit up for a given level. */
export function fillRatio(level: number): number {
  const clamped = clampLevel(level);
  if (clamped <= 0) return 0;
  return clamped / 5;
}

/** The 5 ranked levels rendered as gauge segments, bottom-up. */
export const GAUGE_LEVELS: readonly number[] = [1, 2, 3, 4, 5] as const;
