import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/Skeleton';
import { rangeWindow } from '@/lib/anomalyEventsApi';
import { PLANT_LEVEL_CONFIG } from '@/lib/statusStyles';
import type { AnomalyEvent, AnomalyEventFilters } from '@/types';
import { fmtDuration, fmtTimeShort } from './format';

interface EventsTimelineProps {
  events: AnomalyEvent[] | undefined;
  isLoading: boolean;
  filters: AnomalyEventFilters;
  selectedId: number | null;
  onSelect: (event: AnomalyEvent) => void;
  /** Modo compacto (vista de detalle): la banda cede altura a las gráficas. */
  compact?: boolean;
}

const N_TICKS = 5;
const MIN_BAND_PCT = 0.5;

function eventPeak(event: AnomalyEvent): number {
  return event.inference_refs.reduce((m, r) => Math.max(m, r.valorRiesgo), 0);
}

/**
 * Color de la banda: episodios confirmados en rampa de ROJOS (intensidad =
 * grado de anomalía, más oscuro = peor, coherente con la escala del grafo);
 * candidatas sub-umbral en ÁMBAR (no cumplen las condiciones de episodio).
 */
function bandColor(event: AnomalyEvent): string {
  const peak = eventPeak(event);
  if (event.posible) {
    return `rgba(210,153,34,${(0.5 + 0.4 * peak).toFixed(2)})`;
  }
  const t = Math.max(0, Math.min(1, (peak - 0.5) / 0.5));
  const r = Math.round(248 + (153 - 248) * t);
  const g = Math.round(81 + (27 - 81) * t);
  const b = Math.round(73 + (27 - 73) * t);
  return `rgba(${r},${g},${b},${(0.6 + 0.4 * t).toFixed(2)})`;
}

interface HoverState {
  event: AnomalyEvent;
  leftPct: number;
}

/**
 * Navegador temporal del registro: cada episodio es una banda a ancho
 * proporcional a su duración. Click = abrir el detalle. La barra inferior de
 * cada banda indica si el episodio está abordado (verde) o pendiente (ámbar).
 */
export function EventsTimeline({
  events,
  isLoading,
  filters,
  selectedId,
  onSelect,
  compact = false,
}: EventsTimelineProps) {
  const [hover, setHover] = useState<HoverState | null>(null);

  const { from, to } = useMemo(() => rangeWindow(filters), [filters]);
  const span = Math.max(1, to - from);
  const longRange = span > 26 * 3_600_000;
  const tickFmt = (ms: number) => format(new Date(ms), longRange ? 'dd/MM HH:mm' : 'HH:mm');

  const bands = useMemo(() => {
    const now = Date.now();
    return (events ?? []).map((event) => {
      const isOpen = event.closed_reason === null;
      const start = Date.parse(event.tiempo_inicio);
      const end = isOpen ? now : Date.parse(event.tiempo_fin);
      const leftPct = Math.max(0, ((start - from) / span) * 100);
      const rightPct = Math.min(100, ((end - from) / span) * 100);
      return {
        event,
        isOpen,
        leftPct,
        widthPct: Math.max(MIN_BAND_PCT, rightPct - leftPct),
        color: bandColor(event),
      };
    });
  }, [events, from, span]);

  const ticks = useMemo(
    () => Array.from({ length: N_TICKS }, (_, i) => from + (span * i) / (N_TICKS - 1)),
    [from, span]
  );

  return (
    <div className="shrink-0 relative">
      <div
        className={cn(
          'relative rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] overflow-hidden',
          compact ? 'h-[44px]' : 'h-[96px]'
        )}
      >
        {/* gridlines de los ticks */}
        {ticks.slice(1, -1).map((t) => (
          <span
            key={t}
            className="absolute top-0 bottom-0 w-px bg-[var(--border-subtle)]"
            style={{ left: `${(((t - from) / span) * 100).toFixed(3)}%` }}
          />
        ))}

        {isLoading && events === undefined && (
          <Skeleton.Bar className="absolute inset-2" rounded="sm" />
        )}

        {bands.map(({ event, isOpen, leftPct, widthPct, color }) => {
          const reviewed = event.review_status !== 'pending_review';
          return (
            <button
              key={event.id}
              type="button"
              aria-label={`Episodio #${event.id}, ${fmtTimeShort(event.tiempo_inicio)}, ${
                event.posible ? 'candidata' : 'confirmada'
              }, ${reviewed ? 'abordado' : 'pendiente de abordar'}${isOpen ? ', en curso' : ''}`}
              onClick={() => onSelect(event)}
              onMouseEnter={() => setHover({ event, leftPct })}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover({ event, leftPct })}
              onBlur={() => setHover(null)}
              className={cn(
                'absolute top-0 bottom-0 transition-[filter,outline] hover:brightness-110',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]',
                selectedId === event.id &&
                  'ring-2 ring-[var(--accent-primary)] ring-offset-1 ring-offset-[var(--bg-surface)] z-10'
              )}
              style={{
                left: `${leftPct.toFixed(3)}%`,
                width: `${widthPct.toFixed(3)}%`,
                background: isOpen
                  ? `repeating-linear-gradient(135deg, ${color}, ${color} 4px, transparent 4px, transparent 7px)`
                  : color,
              }}
            >
              {/* indicador de abordaje: verde = con veredicto, ámbar = pendiente */}
              <span
                className="absolute left-0 right-0 bottom-0 h-[3px]"
                style={{
                  backgroundColor: reviewed ? 'var(--status-normal)' : 'var(--status-warning)',
                }}
              />
            </button>
          );
        })}

        {!isLoading && (events?.length ?? 0) === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-[var(--text-muted)]">
            Sin episodios en la franja seleccionada.
          </div>
        )}
      </div>

      {/* eje temporal */}
      <div className="relative h-5 mt-1">
        {ticks.map((t, i) => (
          <span
            key={t}
            className={cn(
              'absolute font-readout text-[10px] text-[var(--text-muted)]',
              i === 0 ? '' : i === N_TICKS - 1 ? '-translate-x-full' : '-translate-x-1/2'
            )}
            style={{ left: `${((i / (N_TICKS - 1)) * 100).toFixed(1)}%` }}
          >
            {tickFmt(t)}
          </span>
        ))}
      </div>

      {/* mini-card de hover — fuera del contenedor recortado (modo compacto) */}
      {hover && (
        <div
          className="absolute z-20 pointer-events-none bg-[var(--bg-surface-raised)] border border-[var(--border-default)] rounded-sm px-2.5 py-1.5 shadow-card max-w-[260px]"
          style={{
            top: compact ? 48 : 100,
            left: `min(max(${hover.leftPct.toFixed(2)}%, 2px), calc(100% - 240px))`,
          }}
        >
            <div className="flex items-center gap-2 text-[11px] font-readout">
              <b className="text-[var(--text-link)]">#{hover.event.id}</b>
              <span
                className={cn(
                  'px-1.5 text-[9.5px] font-medium',
                  (PLANT_LEVEL_CONFIG[hover.event.nivel_pico] ?? PLANT_LEVEL_CONFIG[0]).badge
                )}
              >
                {(PLANT_LEVEL_CONFIG[hover.event.nivel_pico] ?? PLANT_LEVEL_CONFIG[0]).name}
              </span>
              {hover.event.closed_reason === null && (
                <span className="text-[var(--status-critical)] font-semibold text-[9.5px]">
                  EN CURSO
                </span>
              )}
            </div>
            <p className="font-readout text-[10px] text-[var(--text-secondary)] mt-0.5">
              {fmtTimeShort(hover.event.tiempo_inicio)} ·{' '}
              {hover.event.closed_reason === null
                ? 'en curso'
                : fmtDuration(hover.event.duracion_segundos)}{' '}
              · {hover.event.sensores_involucrados.length} sensores
            </p>
            <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">
              {hover.event.posible ? 'Candidata (sub-umbral)' : 'Episodio confirmado'} ·{' '}
              {hover.event.review_status === 'pending_review' ? (
                <span className="text-[var(--status-warning)]">sin abordar</span>
              ) : (
                <span className="text-[var(--status-normal)]">abordado ✓</span>
              )}
            </p>
        </div>
      )}
    </div>
  );
}
