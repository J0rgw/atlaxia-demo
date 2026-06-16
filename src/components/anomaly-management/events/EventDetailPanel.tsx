import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { useReviewAnomalyEvent } from '@/hooks/useAnomalyEvents';
import { buildEventInsights, CRIT_LABEL } from '@/lib/anomalyEventsInsights';
import { FLUVIA_CRIT_BADGE } from '@/lib/statusStyles';
import { eventSensorScores, eventSensorSeries } from '@/data/eventSeriesMock';
import { EVENT_NARRATIVES } from '@/data/fluviaNarrativesMock';
import type { AnomalyEvent, ReviewStatus } from '@/types';
import { FluviaBox, FluviaProse } from '../FluviaBox';
import { EventManagementBox } from './EventManagementBox';
import { HeaderFilter } from './HeaderFilter';
import { fmtDuration, fmtTimeShort } from './format';

// Carga diferida: EventSensorChart arrastra ECharts (~228 KB gz) y es el único
// consumidor del chart en la ruta /anomalies. Sacarlo del chunk eager hace que
// ECharts solo se descargue cuando el operador abre el detalle de un episodio.
const EventSensorChart = lazy(() =>
  import('./EventSensorChart').then((m) => ({ default: m.EventSensorChart }))
);

interface EventDetailPanelProps {
  event: AnomalyEvent;
  onClose: () => void;
}

const REVIEW_VERDICT_OPTIONS: { value: ReviewStatus; label: string }[] = [
  { value: 'pending_review', label: 'Pendiente' },
  { value: 'confirmed_real', label: 'Confirmada real' },
  { value: 'dismissed_fp', label: 'Falso positivo' },
];

const DEFAULT_CHARTS = 3;

/**
 * Investigación inline de un episodio: rango horario al centro, ejes
 * Sistema/Revisión a la derecha, lista de variables por riesgo a la
 * izquierda y gráficas observado-vs-esperado de las seleccionadas, con el
 * resumen FluvIA del episodio debajo.
 */
export function EventDetailPanel({ event, onClose }: EventDetailPanelProps) {
  const review = useReviewAnomalyEvent();
  const isOpen = event.closed_reason === null;

  const scores = useMemo(() => eventSensorScores(event), [event]);
  const [selected, setSelected] = useState<Set<string>>(
    () =>
      new Set(
        scores
          .filter((s) => s.involved)
          .slice(0, DEFAULT_CHARTS)
          .map((s) => s.sensor)
      )
  );

  const charts = useMemo(
    () =>
      scores
        .filter((s) => selected.has(s.sensor))
        .map((s) => ({ score: s.score, series: eventSensorSeries(event, s.sensor) })),
    [event, scores, selected]
  );

  const insights = useMemo(() => buildEventInsights(event), [event]);
  const narrative = EVENT_NARRATIVES[event.id];
  const startMs = Date.parse(event.tiempo_inicio);
  const endMs = Date.parse(event.tiempo_fin);

  // Gestión de foco: al abrir el detalle, mueve el foco al panel; al cerrarlo,
  // lo devuelve a la fila/banda que lo abrió (capturada en el montaje). El panel
  // es una vista inline, no un diálogo modal → no atrapa el foco (sin focus-trap).
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    panelRef.current?.focus({ preventScroll: true });
    return () => opener?.focus?.({ preventScroll: true });
  }, []);

  const toggleSensor = (sensor: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(sensor)) next.delete(sensor);
      else next.add(sensor);
      return next;
    });
  };

  return (
    <div ref={panelRef} tabIndex={-1} className="flex flex-col flex-1 min-h-0 gap-3 outline-none">
      {/* cabecera: volver · rango horario · ejes sistema/revisión */}
      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm" variant="ghost" onClick={onClose}>
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
          Resumen
        </Button>
        <div className="flex-1 min-w-[240px] text-center">
          <p className="font-readout text-md font-semibold text-[var(--text-primary)]">
            {fmtTimeShort(event.tiempo_inicio)}{' '}
            <span className="text-[var(--text-muted)]">→</span>{' '}
            {isOpen ? 'en curso' : fmtTimeShort(event.tiempo_fin)}
          </p>
          <p className="font-readout text-[10px] text-[var(--text-secondary)]">
            episodio #{event.id} · {isOpen ? 'EN CURSO' : fmtDuration(event.duracion_segundos)} ·{' '}
            <span
              className="underline decoration-dotted cursor-help"
              title="Nº de muestras de la racha con nivel de planta ≥ 4 (el scoring es punto a punto, 1 muestra/s; los huecos bajo el umbral dentro de la guarda no cuentan)"
            >
              {event.n_detecciones} detecciones
            </span>{' '}
            · {event.model_name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'inline-flex px-2 py-0.5 text-xs font-medium',
              event.posible
                ? 'bg-[var(--status-warning-muted)] text-[var(--status-warning)]'
                : 'bg-[var(--status-critical-muted)] text-[var(--status-critical)]'
            )}
            title="Eje SISTEMA — lo asigna el agregador, no es editable"
          >
            Sistema · {event.posible ? 'Candidata' : 'Confirmada'}
          </span>
          <HeaderFilter
            label="Revisión"
            variant="chip"
            options={REVIEW_VERDICT_OPTIONS}
            value={event.review_status}
            defaultValue="pending_review"
            onChange={(review_status) => review.mutate({ id: event.id, review_status })}
          />
        </div>
      </div>

      {/* cuerpo: lista de variables + gráficas */}
      <div className="grid grid-cols-1 lg:grid-cols-[230px_1fr] gap-3 flex-1 min-h-0">
        <div className="border border-[var(--border-subtle)] rounded-md bg-[var(--bg-surface)] flex flex-col min-h-0 max-h-56 lg:max-h-none">
          <p className="px-3 py-2 text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.13em] border-b border-[var(--border-subtle)]">
            Variables por riesgo
          </p>
          <div className="flex-1 overflow-auto scrollbar-thin divide-y divide-[var(--border-subtle)]">
            {scores.map(({ sensor, score, involved, desc }) => {
              const active = selected.has(sensor);
              return (
                <button
                  key={sensor}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleSensor(sensor)}
                  title={`${desc}${involved ? ' · involucrado en el episodio' : ' · score de fondo'}`}
                  className={cn(
                    'w-full px-3 py-2 flex items-center gap-2 text-left transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent-primary)]/40',
                    active
                      ? 'bg-[var(--status-advisory-muted)] border-l-2 border-l-[var(--accent-primary)]'
                      : 'hover:bg-[var(--bg-inset)] border-l-2 border-l-transparent'
                  )}
                >
                  <span
                    className={cn(
                      'w-1.5 h-1.5 rounded-full shrink-0',
                      involved ? 'bg-[var(--status-critical)]' : 'bg-[var(--border-default)]'
                    )}
                  />
                  <span
                    className={cn(
                      'font-readout text-xs font-semibold min-w-[58px]',
                      involved ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'
                    )}
                  >
                    {sensor}
                  </span>
                  <span className="flex-1 h-[5px] rounded-sm bg-[var(--bg-inset)] overflow-hidden">
                    <span
                      className="block h-full rounded-sm bg-gradient-to-r from-[var(--status-warning)] to-[var(--status-emergency)]"
                      style={{ width: `${Math.round(score * 100)}%` }}
                    />
                  </span>
                  <span className="font-readout text-[10px] text-[var(--text-secondary)]">
                    {score.toFixed(2)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col min-h-0 gap-2">
          <div className="flex items-center gap-4 text-[10px] font-readout text-[var(--text-secondary)] px-1">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-4 h-0.5 bg-[#58a6ff] inline-block" /> observado
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-4 border-t-2 border-dashed border-[#bc8cff] inline-block" /> esperado
              (modelo)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-2.5 bg-[rgba(248,81,73,0.18)] inline-block" /> residuo
            </span>
            <span className="ml-auto text-[var(--text-muted)]">ventana del episodio ±10%</span>
          </div>
          <div className="flex-1 min-h-0 overflow-auto scrollbar-thin space-y-2 pr-1">
            {charts.length === 0 ? (
              <div className="py-10 text-center text-xs text-[var(--text-muted)]">
                Selecciona variables de la lista para ver sus gráficas.
              </div>
            ) : (
              <Suspense
                fallback={
                  <div className="py-10 text-center text-xs text-[var(--text-muted)]">
                    Cargando gráficas…
                  </div>
                }
              >
                {charts.map(({ series, score }) => (
                  <EventSensorChart
                    key={series.sensor}
                    series={series}
                    score={score}
                    eventStartMs={startMs}
                    eventEndMs={endMs}
                  />
                ))}
              </Suspense>
            )}
          </div>
        </div>
      </div>

      {/* pie: FluvIA (colapsable) + gestión humana del episodio */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 shrink-0 items-start">
      <div className="border border-[var(--border-subtle)] rounded-md bg-[var(--bg-surface)] p-3">
        <FluviaBox
          context="· Resumen del episodio"
          collapsible
          defaultOpen={false}
          headerExtra={
            <span
              className={cn(
                'inline-block text-[9.5px] font-semibold px-2 py-0.5 rounded-full border uppercase tracking-wider',
                FLUVIA_CRIT_BADGE[insights.crit]
              )}
            >
              criticidad {CRIT_LABEL[insights.crit]}
            </span>
          }
        >
          <div className="space-y-2">
            {narrative ? (
              narrative.map((p, i) => <FluviaProse key={i} text={p} />)
            ) : (
              <p>
                Episodio {event.posible ? 'candidato (sub-umbral)' : 'confirmado por duración'} en{' '}
                <b>{insights.processes.map((p) => p.name).join(' y ') || '—'}</b>, de{' '}
                <b>{fmtTimeShort(event.tiempo_inicio)}</b> a{' '}
                <b>{isOpen ? 'ahora (en curso)' : fmtTimeShort(event.tiempo_fin)}</b>
                {!isOpen && <> ({fmtDuration(event.duracion_segundos)})</>}. La primera señal
                anómala fue <b>{insights.firstSignal}</b>
                {insights.otherSignals.length > 0 && (
                  <>
                    ; después se desviaron <b>{insights.otherSignals.join(', ')}</b>
                  </>
                )}
                .
              </p>
            )}

            <p className="pt-1 border-t border-[var(--border-subtle)]">
              {insights.reviewed ? (
                <>
                  Veredicto del operador:{' '}
                  <b>
                    {event.review_status === 'confirmed_real'
                      ? 'anomalía real confirmada'
                      : 'descartada como falso positivo'}
                  </b>
                  .
                </>
              ) : (
                <b className="text-[var(--status-warning)]">Pendiente de veredicto del operador.</b>
              )}{' '}
              <span className="text-[10px] text-[var(--text-muted)] italic">
                FluvIA describe lo observado, no concluye causas.
              </span>
            </p>
          </div>
        </FluviaBox>
      </div>

      <EventManagementBox event={event} />
      </div>
    </div>
  );
}
