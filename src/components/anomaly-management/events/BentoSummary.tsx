import { useMemo } from 'react';
import { format } from 'date-fns';
import { Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/Skeleton';
import { rangeWindow } from '@/lib/anomalyEventsApi';
import { buildRangeInsights, CRIT_LABEL } from '@/lib/anomalyEventsInsights';
import { FLUVIA_CRIT_BADGE, PLANT_LEVEL_CONFIG } from '@/lib/statusStyles';
import { RANGE_NARRATIVES } from '@/data/fluviaNarrativesMock';
import type { AnomalyEvent, AnomalyEventFilters } from '@/types';
import { FluviaBox, FluviaProse } from '../FluviaBox';
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
      {sub && (
        <p className="font-readout text-[10px] text-[var(--text-muted)] truncate">{sub}</p>
      )}
    </div>
  );
}

/**
 * Resumen de franja, jerarquía en dos superficies: una barra de stats densa
 * (lectura de un vistazo) y FluvIA como protagonista — parte de relevo de
 * turno con triage de "dónde mirar primero" (decision support investigativo,
 * nunca actuación sobre el proceso).
 */
export function BentoSummary({ events, isLoading, filters }: BentoSummaryProps) {
  const window_ = useMemo(() => rangeWindow(filters), [filters]);
  const insights = useMemo(() => buildRangeInsights(events ?? [], window_), [events, window_]);
  // narrativa curada para los presets; 'custom' cae al resumen estructurado
  const narrative = RANGE_NARRATIVES[filters.range];

  if (isLoading && events === undefined) {
    return (
      <div className="flex-1 min-h-0 space-y-3">
        <Skeleton.Box className="h-[68px]" />
        <Skeleton.Box className="min-h-[220px]" />
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
    <div className="flex-1 min-h-0 overflow-auto scrollbar-thin space-y-3 pr-0.5">
      {/* barra de stats — una sola superficie, lectura de un vistazo */}
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
        <Stat
          label="Sin abordar"
          value={insights.pending}
          sub={`${insights.reviewedPct}% abordado`}
        />
        <Stat
          label="Tiempo en anomalía"
          value={insights.anomalySeconds > 0 ? fmtDuration(insights.anomalySeconds) : '0 s'}
          sub={`${(insights.anomalyFraction * 100).toFixed(2)}% de la franja`}
        />
        <Stat
          label="Nivel pico"
          value={
            <span className={cn('inline-flex px-2 py-0.5 text-sm font-medium font-readout', level.badge)}>
              {level.name}
            </span>
          }
          sub={insights.maxLevelEventId !== null ? `episodio #${insights.maxLevelEventId}` : '—'}
        />
      </div>

      {/* FluvIA hero — el parte de relevo es el protagonista */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] border-l-[3px] border-l-[var(--accent-primary)] rounded-md p-4">
        <FluviaBox
          context="· Parte de franja"
          size="md"
          headerExtra={
            <>
              {insights.total > 0 && (
                <span
                  className={cn(
                    'text-[9.5px] font-semibold px-2 py-0.5 rounded-full border uppercase tracking-wider',
                    FLUVIA_CRIT_BADGE[insights.crit]
                  )}
                >
                  criticidad {CRIT_LABEL[insights.crit]}
                </span>
              )}
              {insights.activityFrom !== null && insights.activityTo !== null && (
                <span className="font-readout text-[10px] text-[var(--text-muted)]">
                  actividad {hourFmt(insights.activityFrom)} – {hourFmt(insights.activityTo)}
                </span>
              )}
            </>
          }
        >
          {insights.total === 0 ? (
            <p>
              Sin episodios en la franja seleccionada — la planta se mantuvo en{' '}
              <b>régimen normal</b>.
            </p>
          ) : (
            <>
              {narrative ? (
                narrative.paragraphs.map((p, i) => <FluviaProse key={i} text={p} />)
              ) : (
                <>
                  <p>
                    <b>{insights.total} episodios</b> en la franja ({insights.confirmed}{' '}
                    confirmados, {insights.candidates} candidatas), criticidad máxima{' '}
                    <b>{CRIT_LABEL[insights.crit]}</b>
                    {insights.maxLevelEventId !== null && (
                      <> en el episodio #{insights.maxLevelEventId}</>
                    )}
                    .
                    {insights.open > 0 && (
                      <>
                        {' '}
                        <b className="text-[var(--status-critical)]">Hay un episodio EN CURSO</b> (#
                        {insights.openEventId}).
                      </>
                    )}
                  </p>
                  <p>
                    Actividad concentrada en{' '}
                    <b>{insights.processes.map((p) => p.name).join(' y ') || '—'}</b>
                    {insights.recurrentSensor && (
                      <>
                        . <b>{insights.recurrentSensor.sensor}</b> aparece en{' '}
                        {insights.recurrentSensor.count} episodios — patrón recurrente a vigilar
                      </>
                    )}
                    .{' '}
                    {insights.pending > 0 ? (
                      <>
                        <b>{insights.pending} episodios siguen sin abordar.</b>
                      </>
                    ) : (
                      <>Todos los episodios están abordados.</>
                    )}
                  </p>
                </>
              )}

              {/* triage de relevo — investigativo, no prescriptivo de proceso */}
              {narrative && (
                <div className="flex items-start gap-2 bg-[var(--status-advisory-muted)] border border-[var(--accent-primary)]/20 border-l-[3px] border-l-[var(--accent-primary)] rounded-sm px-3 py-2">
                  <Eye className="w-3.5 h-3.5 text-[var(--accent-primary)] shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-[9px] font-semibold text-[var(--accent-primary)] uppercase tracking-[0.13em] mb-0.5">
                      Dónde mirar primero
                    </p>
                    <FluviaProse text={narrative.lookFirst} className="text-xs" />
                  </div>
                </div>
              )}

              {/* footer: contexto de planta + nota de alcance */}
              <div className="flex items-center gap-x-4 gap-y-2 flex-wrap pt-2 border-t border-[var(--border-subtle)]">
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
                  <span
                    key={s.sensor}
                    className="font-readout text-[10px] text-[var(--text-secondary)]"
                  >
                    {s.sensor} <span className="text-[var(--text-muted)]">×{s.count}</span>
                  </span>
                ))}
                <span className="ml-auto text-[10px] text-[var(--text-muted)] italic">
                  FluvIA describe lo observado, no concluye causas.
                </span>
              </div>
            </>
          )}
        </FluviaBox>
      </div>
    </div>
  );
}
