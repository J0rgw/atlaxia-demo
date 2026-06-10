/**
 * SensorCard Component
 * Enriched sensor visualization with large value display, progress bar,
 * status badges, trend sparkline, and AI confidence indicator.
 *
 * Enhanced with:
 * - Animated value transitions
 * - Live pulsing indicator
 * - Data freshness badge
 * - Value change highlight
 */

import { useMemo, useEffect, useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { getFreshnessInfo } from '@/lib/timeUtils';
import type {
  IndustrialSensor,
  SensorEvaluation,
  AlarmLevel,
} from '@/types/industrial';

interface SensorCardProps {
  sensor: IndustrialSensor;
  evaluation?: SensorEvaluation;
  value?: number | null;
  timestamp?: number;
  trend?: 'up' | 'down' | 'stable';
  trendPercent?: number;
  aiConfidence?: number;
  sparklineData?: number[];
  isFavorite?: boolean;
  isLive?: boolean;
  /** Fires when any non-button surface of the card is clicked. */
  onCardClick?: () => void;
  onFavoriteToggle?: () => void;
  onInfoClick?: () => void;
  /** Same destination as onCardClick; the chart icon stays as a visual cue. */
  onChartClick?: () => void;
  className?: string;
}

// ISA-101 compliant: neutral backgrounds, color only for exceptions
const STATUS_CONFIG = {
  normal: {
    bgColor: 'bg-[var(--bg-surface)]',
    borderColor: 'border-[var(--border-subtle)]',
    dotColor: 'bg-[var(--text-muted)]',
    badgeBg: 'bg-[var(--bg-inset)]',
    badgeText: 'text-[var(--text-secondary)]',
    progressBg: 'bg-[var(--text-muted)]',
    label: 'OK',
    accentBorder: '',
  },
  warning: {
    bgColor: 'bg-[var(--bg-surface)]',
    borderColor: 'border-[var(--status-warning)]',
    dotColor: 'bg-[var(--status-warning)]',
    badgeBg: 'bg-[var(--status-warning-muted)]',
    badgeText: 'text-[var(--status-warning)]',
    progressBg: 'bg-[var(--status-warning)]',
    label: 'WARN',
    accentBorder: 'border-l-4 border-l-[var(--status-warning)]',
  },
  critical: {
    bgColor: 'bg-[var(--bg-surface)]',
    borderColor: 'border-[var(--status-critical)]',
    dotColor: 'bg-[var(--status-critical)] animate-pulse',
    badgeBg: 'bg-[var(--status-critical-muted)]',
    badgeText: 'text-[var(--status-critical)]',
    progressBg: 'bg-[var(--status-critical)]',
    label: 'CRIT',
    accentBorder: 'border-l-4 border-l-[var(--status-critical)]',
  },
};

const ALARM_LEVEL_LABELS: Record<AlarmLevel, string> = {
  HH: 'MUY ALTO',
  H: 'ALTO',
  L: 'BAJO',
  LL: 'MUY BAJO',
};

function Sparkline({ data, className }: { data: number[]; className?: string }) {
  if (!data || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const width = 60;
  const height = 20;
  const padding = 2;

  const points = data.map((value, index) => {
    const x = padding + (index / (data.length - 1)) * (width - 2 * padding);
    const y = height - padding - ((value - min) / range) * (height - 2 * padding);
    return `${x},${y}`;
  });

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={cn('h-5 w-16', className)}>
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TrendIndicator({
  trend,
  percent,
}: {
  trend: 'up' | 'down' | 'stable';
  percent?: number;
}) {
  const arrows = {
    up: (
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z"
          clipRule="evenodd"
        />
      </svg>
    ),
    down: (
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z"
          clipRule="evenodd"
        />
      </svg>
    ),
    stable: (
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
          clipRule="evenodd"
        />
      </svg>
    ),
  };

  const colors = {
    up: 'text-[var(--status-normal)]',
    down: 'text-[var(--status-critical)]',
    stable: 'text-[var(--text-secondary)]',
  };

  return (
    <span className={cn('inline-flex items-center gap-0.5 text-xs', colors[trend])}>
      {arrows[trend]}
      {percent !== undefined && (
        <span>{percent > 0 ? '+' : ''}{percent.toFixed(1)}%</span>
      )}
    </span>
  );
}

function ProgressBar({
  value,
  min,
  max,
  status,
}: {
  value: number;
  min: number;
  max: number;
  status: 'normal' | 'warning' | 'critical';
}) {
  const range = max - min || 1;
  let percent = ((value - min) / range) * 100;
  percent = Math.max(0, Math.min(100, percent));

  const config = STATUS_CONFIG[status];

  return (
    <div className="relative h-2 bg-[var(--bg-inset)] rounded-full overflow-hidden">
      <div
        className={cn('h-full rounded-full transition-all duration-300', config.progressBg)}
        style={{ width: `${percent}%` }}
      />
      {/* Marker lines at 25%, 50%, 75% */}
      <div className="absolute inset-0 flex">
        <div className="w-1/4 border-r border-white/20" />
        <div className="w-1/4 border-r border-white/30" />
        <div className="w-1/4 border-r border-white/20" />
      </div>
    </div>
  );
}

function AnimatedValue({
  value,
  precision,
  className,
}: {
  value: number;
  precision: number;
  className?: string;
}) {
  const [displayValue, setDisplayValue] = useState(value);
  const [isAnimating, setIsAnimating] = useState(false);
  const prevValueRef = useRef(value);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (prevValueRef.current === value) return;

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    setIsAnimating(true);
    const timer = setTimeout(() => setIsAnimating(false), 300);

    const startValue = prevValueRef.current;
    const endValue = value;
    const duration = 200;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const currentValue = startValue + (endValue - startValue) * easeProgress;
      setDisplayValue(currentValue);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        rafRef.current = null;
        setDisplayValue(endValue);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    prevValueRef.current = value;

    return () => {
      clearTimeout(timer);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [value]);

  return (
    <span
      className={cn(
        className,
        'transition-all duration-200',
        isAnimating && 'scale-105'
      )}
    >
      {displayValue.toFixed(precision)}
    </span>
  );
}

function LiveIndicator({ isLive }: { isLive: boolean }) {
  if (!isLive) return null;

  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[var(--status-normal-muted)] rounded text-[10px] font-semibold text-[var(--status-normal)]">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--status-normal)] opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--status-normal)]" />
      </span>
      LIVE
    </span>
  );
}

function FreshnessBadge({ timestamp }: { timestamp?: number }) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  if (!timestamp) return null;

  const { text, color } = getFreshnessInfo(timestamp);

  return (
    <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium', color)}>
      {text}
    </span>
  );
}

export function SensorCard({
  sensor,
  evaluation,
  value: propValue,
  timestamp,
  trend = 'stable',
  trendPercent,
  aiConfidence,
  sparklineData,
  isFavorite = false,
  isLive = false,
  onCardClick,
  onFavoriteToggle,
  onInfoClick,
  onChartClick,
  className,
}: SensorCardProps) {
  const hasData = propValue != null || evaluation?.value != null;
  const value = propValue ?? evaluation?.value ?? 0;
  const status = evaluation?.status ?? 'normal';
  const config = STATUS_CONFIG[status];
  const [hasRecentChange, setHasRecentChange] = useState(false);
  const prevValueRef = useRef(value);

  // Detect value changes and trigger highlight
  useEffect(() => {
    if (prevValueRef.current !== value) {
      setHasRecentChange(true);
      const timer = setTimeout(() => setHasRecentChange(false), 500);
      prevValueRef.current = value;
      return () => clearTimeout(timer);
    }
  }, [value]);

  const rangeText = useMemo(() => {
    const { min, max } = sensor.operatingLimits.normal;
    return `${min}-${max}`;
  }, [sensor.operatingLimits.normal]);

  const alarmLevel = evaluation?.alarm?.level;

  return (
    <div
      onClick={onCardClick}
      className={cn(
        'rounded-md border p-4 transition-all duration-200 hover:shadow-md',
        config.bgColor,
        config.borderColor,
        config.accentBorder,
        !hasData && 'opacity-60',
        status === 'critical' && 'ring-1 ring-[var(--status-critical)]/50',
        hasRecentChange && 'ring-2 ring-[var(--status-advisory)] ring-offset-1',
        onCardClick && 'cursor-pointer',
        className
      )}
    >
      {/* Header: tag · ISA state · favorite */}
      <div className="flex items-start justify-between mb-3 gap-2">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <h3 className="font-bold text-[var(--text-primary)] text-sm">{sensor.tag}</h3>
          <span
            className={cn(
              'inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wider',
              config.badgeBg,
              config.badgeText,
            )}
          >
            {config.label}
          </span>
        </div>
        {onFavoriteToggle && (
          <button
            onClick={(e) => { e.stopPropagation(); onFavoriteToggle(); }}
            className="p-1 -m-1 rounded hover:bg-white/50 transition-colors flex-shrink-0"
            aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <svg
              className={cn(
                'w-4 h-4',
                isFavorite ? 'text-[var(--status-warning)] fill-[var(--status-warning)]' : 'text-[var(--text-muted)]'
              )}
              viewBox="0 0 20 20"
              fill={isFavorite ? 'currentColor' : 'none'}
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </button>
        )}
      </div>

      {/* Big value */}
      <div className="flex items-baseline gap-2 mb-3">
        {hasData ? (
          <>
            <AnimatedValue
              value={value}
              precision={sensor.engineering.precision}
              className={cn(
                'font-readout font-bold text-3xl leading-none',
                status === 'critical' ? 'text-[var(--status-critical)]' : 'text-[var(--text-primary)]'
              )}
            />
            <span className="text-sm text-[var(--text-secondary)]">{sensor.engineering.unit}</span>
          </>
        ) : (
          <span className="font-readout font-bold text-3xl leading-none text-[var(--text-muted)]">--</span>
        )}
      </div>

      {/* Call-to-action: entire card is clickable; this line tells the user. */}
      <p className="text-xs text-[var(--text-muted)]">Clic para ver el gráfico</p>
    </div>
  );
}

export default SensorCard;
