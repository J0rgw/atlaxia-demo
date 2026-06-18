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

import { useEffect, useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import type {
  IndustrialSensor,
  SensorEvaluation,
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

export function SensorCard({
  sensor,
  evaluation,
  value: propValue,
  isFavorite = false,
  onCardClick,
  onFavoriteToggle,
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
          <Badge
            axis="sensor"
            value={status === 'critical' ? 'crit' : status === 'warning' ? 'warn' : 'ok'}
          />
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
