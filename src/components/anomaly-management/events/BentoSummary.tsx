import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/Skeleton';
import { rangeWindow } from '@/lib/anomalyEventsApi';
import { buildRangeInsights } from '@/lib/anomalyEventsInsights';
import { Badge } from '@/components/ui/Badge';
import { criticalityFromLevel } from '@/lib/statusStyles';
import type { AnomalyEvent, AnomalyEventFilters } from '@/types';
import { fmtDuration } from './format';

interface BentoSummaryProps {
  events: AnomalyEvent[] | undefined;
  isLoading: boolean;
  filters: AnomalyEventFilters;
}

/**
 * Celda métrica de la franja: cifra prominente arriba, etiqueta debajo y su
 * matiz al pie. Patrón KPI estándar (valor → etiqueta → contexto), escaneable
 * de un vistazo. `flex-1` reparte el ancho a partes iguales para que la franja
 * se llene sin huecos.
 */
function MetricCell({
  value,
  label,
  sub,
  tone,
}: {
  value: React.ReactNode;
  label: string;
  sub?: string;
  tone?: 'warning';
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 px-4 py-2.5">
      <span
        className={cn(
          'font-readout text-xl font-bold leading-none',
          tone === 'warning' ? 'text-[var(--status-warning)]' : 'text-[var(--text-primary)]'
        )}
      >
        {value}
      </span>
      <span className="truncate text-[11px] font-medium uppercase tracking-wide text-[var(--text-secondary)]">
        {label}
      </span>
      {sub && (
        <span className="truncate font-readout text-[10px] text-[var(--text-muted)]">{sub}</span>
      )}
    </div>
  );
}

/**
 * Estado del periodo (columna izquierda, fijo sobre la tabla): una franja única
 * que abre con el estado de planta (en curso ⇄ estable, lectura de un vistazo
 * estilo ISA-101) y reparte a su derecha las cifras del periodo en celdas de
 * igual peso, separadas por divisores, que llenan todo el ancho. El parte
 * narrativo y el triage «dónde empezar» viven en el copiloto FluvIA (rail
 * derecho).
 */
export function BentoSummary({ events, isLoading, filters }: BentoSummaryProps) {
  const window_ = useMemo(() => rangeWindow(filters), [filters]);
  const insights = useMemo(() => buildRangeInsights(events ?? [], window_), [events, window_]);

  if (isLoading && events === undefined) {
    return <Skeleton.Box className="h-[68px] shrink-0 rounded-lg" />;
  }

  if (insights.total === 0) {
    return (
      <div className="flex shrink-0 items-center gap-2.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-3 text-sm text-[var(--text-secondary)]">
        <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--status-normal)]" />
        <span>
          Sin episodios en el periodo: la planta se mantuvo en{' '}
          <b className="text-[var(--text-primary)]">régimen normal</b>.
        </span>
      </div>
    );
  }

  return (
    <div className="flex shrink-0 items-stretch divide-x divide-[var(--border-subtle)] overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
      <MetricCell
        value={insights.total}
        label="Episodios"
        sub={`${insights.confirmed} conf · ${insights.candidates} cand`}
      />
      <MetricCell
        value={insights.pending}
        label="Sin abordar"
        sub={`${insights.reviewedPct}% abordado`}
        tone={insights.pending > 0 ? 'warning' : undefined}
      />
      <MetricCell
        value={insights.anomalySeconds > 0 ? fmtDuration(insights.anomalySeconds) : '0 s'}
        label="En anomalía"
        sub={`${(insights.anomalyFraction * 100).toFixed(2)}% del periodo`}
      />

      {/* nivel pico: el indicador más fuerte cierra la franja, alineado con las celdas */}
      <div className="flex shrink-0 flex-col justify-center gap-1.5 px-4 py-2.5">
        <Badge axis="criticality" value={criticalityFromLevel(insights.maxLevel)} />
        <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-secondary)]">
          Nivel pico
          {insights.maxLevelEventId !== null && (
            <span className="font-readout normal-case text-[var(--text-muted)]">
              {' '}
              · #{insights.maxLevelEventId}
            </span>
          )}
        </span>
      </div>
    </div>
  );
}
