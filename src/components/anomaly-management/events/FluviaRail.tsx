import { useCallback, useMemo } from 'react';
import { ChevronLeft, ChevronRight, LayoutGrid, Sparkles } from 'lucide-react';
import { AssistantRuntimeProvider } from '@assistant-ui/react';
import { cn } from '@/lib/utils';
import { PLANT_LEVEL_CONFIG } from '@/lib/statusStyles';
import { useReviewAnomalyEvent } from '@/hooks/useAnomalyEvents';
import type { AnomalyEvent, AnomalyEventFilters, ReviewStatus } from '@/types';
import { buildOverview } from './fluvia/overview';
import { eventAnswer, eventSuggestions, OVERVIEW_SUGGESTIONS, overviewAnswer } from './fluvia/chatMock';
import { useFluviaMockRuntime, usePrefersReducedMotion } from './fluvia/useFluviaMockRuntime';
import { FluviaChatThread } from './fluvia/FluviaChatThread';
import { FluviaOverviewView } from './fluvia/FluviaOverviewView';
import { FluviaEventView } from './fluvia/FluviaEventView';

interface FluviaRailProps {
  /** Episodios del periodo (sin filtros de estado): base del resumen y la navegación. */
  events: AnomalyEvent[] | undefined;
  isLoading: boolean;
  filters: AnomalyEventFilters;
  /** Episodio activo (versión fresca) o null → modo «Visión general». */
  selected: AnomalyEvent | null;
  /** Dirige la selección: un evento → modo evento; null → visión general. */
  onSelect: (event: AnomalyEvent | null) => void;
  /** Abre el EventDetailPanel completo en superficie aparte. */
  onOpenDetail: (event: AnomalyEvent) => void;
}

const DEMO_PILL = (
  <span className="font-readout text-[9px] uppercase tracking-wider text-[var(--text-muted)] border border-[var(--border-subtle)] rounded-full px-2 py-0.5 whitespace-nowrap">
    futuro asistente · demo
  </span>
);

/**
 * Copiloto FluvIA: rail contextual del tab «Eventos» (disposición «Copiloto
 * lateral»). Dos modos: «Visión general» (resumen IA navegable del periodo) y
 * «Evento #N» (investigación compacta del episodio seleccionado), con un hilo
 * conversacional mock (assistant-ui) debajo. La selección la dirige el padre;
 * la columna izquierda permanece estable.
 *
 * Invariante de altura (no negociable): el rail rellena la altura de su columna
 * y NO crece con su contenido: cabecera y compositor son `flex-none`, sólo el
 * cuerpo del hilo scrollea (ver `FluviaChatThread`).
 */
export function FluviaRail({ events, isLoading, filters, selected, onSelect, onOpenDetail }: FluviaRailProps) {
  const reducedMotion = usePrefersReducedMotion();
  const review = useReviewAnomalyEvent();

  const overviewModel = useMemo(() => buildOverview(events ?? [], filters), [events, filters]);

  // Orden de revisión «uno a uno»: cronológico (igual que la timeline).
  const ordered = useMemo(
    () => [...(events ?? [])].sort((a, b) => Date.parse(a.tiempo_inicio) - Date.parse(b.tiempo_inicio)),
    [events]
  );
  const index = selected ? ordered.findIndex((e) => e.id === selected.id) : -1;

  const selectById = useCallback(
    (id: number) => {
      const found = (events ?? []).find((e) => e.id === id);
      if (found) onSelect(found);
    },
    [events, onSelect]
  );

  const mode = selected ? 'event' : 'overview';
  const contextKey = selected ? `event:${selected.id}` : 'overview';

  const answer = useCallback(
    (prompt: string) => (selected ? eventAnswer(prompt, selected) : overviewAnswer(prompt, overviewModel)),
    [selected, overviewModel]
  );

  const { runtime, hasMessages, messageCount, streamLen } = useFluviaMockRuntime({
    contextKey,
    answer,
    reducedMotion,
  });

  const onVerdict = (status: ReviewStatus) => {
    if (selected) review.mutate({ id: selected.id, review_status: status });
  };

  const level = selected ? PLANT_LEVEL_CONFIG[selected.nivel_pico] ?? PLANT_LEVEL_CONFIG[0] : null;

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <aside
        aria-label="Copiloto FluvIA"
        className="flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)]"
      >
        {/* cabecera: flex-none */}
        <header className="flex-none border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2.5 px-4 py-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white">
              <Sparkles className="h-4 w-4" />
            </span>
            <span className="truncate text-sm font-bold text-[var(--text-primary)]">
              FluvIA{' '}
              <span className="font-medium text-[var(--accent-primary)]">
                {selected ? `· Evento #${selected.id}` : '· Visión general'}
              </span>
            </span>
            <span className="ml-auto">{DEMO_PILL}</span>
          </div>

          {/* sub-cabecera del modo evento: ⊞ visión general · nivel · navegación ◀ i/N ▶ */}
          {selected && (
            <div className="flex items-center gap-2 border-t border-[var(--border-subtle)] px-3 py-2">
              <button
                type="button"
                onClick={() => onSelect(null)}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-sm px-2 py-1 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-inset)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/40"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Visión general
              </button>

              {level && (
                <span className={cn('ml-auto inline-flex px-2 py-0.5 text-[10px] font-medium font-readout', level.badge)}>
                  {level.name}
                </span>
              )}

              <div className="inline-flex items-center rounded-md border border-[var(--border-default)] bg-[var(--bg-inset)]">
                <button
                  type="button"
                  aria-label="Episodio anterior"
                  disabled={index <= 0}
                  onClick={() => index > 0 && onSelect(ordered[index - 1])}
                  className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-l-md text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent-primary)]/40"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <span className="px-2 font-readout text-[10px] text-[var(--text-secondary)] whitespace-nowrap">
                  {index >= 0 ? `${index + 1} / ${ordered.length}` : `· / ${ordered.length}`}
                </span>
                <button
                  type="button"
                  aria-label="Episodio siguiente"
                  disabled={index < 0 || index >= ordered.length - 1}
                  onClick={() => index < ordered.length - 1 && onSelect(ordered[index + 1])}
                  className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-r-md text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent-primary)]/40"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </header>

        {/* cuerpo (intro contextual + hilo) + compositor */}
        <FluviaChatThread
          contextKey={contextKey}
          hasMessages={hasMessages}
          messageCount={messageCount}
          streamLen={streamLen}
          reducedMotion={reducedMotion}
          onSelectRef={selectById}
          suggestions={selected ? eventSuggestions(selected) : OVERVIEW_SUGGESTIONS}
          placeholder={selected ? `Pregunta por el episodio #${selected.id}…` : 'Pregunta a FluvIA…'}
          intro={
            mode === 'event' && selected ? (
              <FluviaEventView
                event={selected}
                onSelectRef={selectById}
                onOpenDetail={() => onOpenDetail(selected)}
                onVerdict={onVerdict}
                verdictPending={review.isPending}
              />
            ) : (
              <FluviaOverviewView
                model={overviewModel}
                isLoading={isLoading}
                onSelectRef={selectById}
                onReview={() => ordered[0] && onSelect(ordered[0])}
                canReview={ordered.length > 0}
              />
            )
          }
        />
      </aside>
    </AssistantRuntimeProvider>
  );
}
