import { useMemo } from 'react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/Skeleton';
import { rangeWindow } from '@/lib/anomalyEventsApi';
import { buildRangeInsights } from '@/lib/anomalyEventsInsights';
import { PLANT_LEVEL_CONFIG } from '@/lib/statusStyles';
import type { AnomalyEvent, AnomalyEventFilters } from '@/types';
import { fmtDuration } from './format';

interface BentoSummaryProps {
  events: AnomalyEvent[] | undefined;
  isLoading: boolean;
  filters: AnomalyEventFilters;
}

function Stat({
  label,
  value,
  sub,
  pulse,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  pulse?: boolean;
}) {
  return (
    <div className="px-4 py-2.5 min-w-0 flex-1">
      <p className="text-[10px] font-medium text-[var(--text-secondary)] uppercase tracking-wider truncate">
        {label}
      </p>
      <p className="font-readout text-xl font-bold text-[var(--text-primary)] leading-tight flex items-center gap-1.5">
        {value}
        {pulse && (
          <span className="w-2 h-2 rounded-full bg-[var(--status-critical)] animate-pulse motion-reduce:animate-none" />
        )}
      </p>
      {sub && <p className="font-readout text-[10px] text-[var(--text-muted)] truncate">{sub}</p>}
    </div>
  );
}

/**
 * KPIs del periodo (columna izquierda, fijos arriba de la tabla): una barra de
 * stats densa de lectura de un vistazo + el contexto de planta (procesos /
 * sensores top / actividad). El parte narrativo y el triage «dónde empezar»
 * viven en el copiloto FluvIA (rail derecho).
 */
export function BentoSummary({ events, isLoading, filters }: BentoSummaryProps) {
  const window_ = useMemo(() => rangeWindow(filters), [filters]);
  const insights = useMemo(() => buildRangeInsights(events ?? [], window_), [events, window_]);

  if (isLoading && events === undefined) {
    return (
      <div className="space-y-3 shrink-0">
        <Skeleton.Box className="h-[68px]" />
        <Skeleton.Box className="h-[60px]" />
      </div>
    );
  }

  const level = PLANT_LEVEL_CONFIG[insights.maxLevel] ?? PLANT_LEVEL_CONFIG[0];
  const sameDay =
    insights.activityFrom !== null &&
    insights.activityTo !== null &&
    new Date(insights.activityFrom).toDateString() === new Date(insights.activityTo).toDateString();
  const hourFmt = (ms: number) => format(new Date(ms), sameDay ? 'HH:mm' : 'dd/MM HH:mm');

  return (
    <div className="space-y-3 shrink-0">
      {/* barra de stats: una sola superficie, lectura de un vistazo */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-md grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 divide-x divide-y sm:divide-y-0 divide-[var(--border-subtle)] overflow-hidden">
        <Stat
          label="Episodios"
          value={insights.total}
          sub={`${insights.confirmed} conf. · ${insights.candidates} cand.`}
        />
        <Stat
          label="En curso"
          value={insights.open}
          pulse={insights.open > 0}
          sub={insights.open > 0 ? `episodio #${insights.openEventId}` : 'sin episodio activo'}
        />
        <Stat label="Sin abordar" value={insights.pending} sub={`${insights.reviewedPct}% abordado`} />
        <Stat
          label="Tiempo en anomalía"
          value={insights.anomalySeconds > 0 ? fmtDuration(insights.anomalySeconds) : '0 s'}
          sub={`${(insights.anomalyFraction * 100).toFixed(2)}% del periodo`}
        />
        <Stat
          label="Nivel pico"
          value={
            <span className={cn('inline-flex px-2 py-0.5 text-sm font-medium font-readout', level.badge)}>
              {level.name}
            </span>
          }
          sub={insights.maxLevelEventId !== null ? `episodio #${insights.maxLevelEventId}` : '·'}
        />
      </div>

      {insights.total === 0 ? (
        <div className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-3 text-xs text-[var(--text-secondary)]">
          Sin episodios en el periodo seleccionado, la planta se mantuvo en{' '}
          <b className="text-[var(--text-primary)]">régimen normal</b>.
        </div>
      ) : (
        /* contexto de planta: procesos + sensores recurrentes + actividad */
        <div className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3 flex items-center gap-x-4 gap-y-2 flex-wrap">
          {insights.processes.map((p) => (
            <span
              key={p.pk}
              className="text-[10px] px-2 py-0.5 rounded-full border whitespace-nowrap"
              style={{
                color: p.color,
                backgroundColor: `color-mix(in srgb, ${p.color} 15%, transparent)`,
                borderColor: `color-mix(in srgb, ${p.color} 36%, transparent)`,
              }}
            >
              {p.name}
            </span>
          ))}
          {insights.topSensors.map((s) => (
            <span key={s.sensor} className="font-readout text-[10px] text-[var(--text-secondary)]">
              {s.sensor} <span className="text-[var(--text-muted)]">×{s.count}</span>
            </span>
          ))}
          {insights.activityFrom !== null && insights.activityTo !== null && (
            <span className="ml-auto font-readout text-[10px] text-[var(--text-muted)]">
              actividad {hourFmt(insights.activityFrom)} → {hourFmt(insights.activityTo)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
