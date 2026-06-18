import { Check, Maximize2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EVENT_NARRATIVES } from '@/data/fluviaNarrativesMock';
import type { AnomalyEvent, ReviewStatus } from '@/types';
import { FluviaMarkdown } from './FluviaMarkdown';
import { linkifyRefs } from './overview';
import { fmtDuration, fmtTimeShort } from '../format';

interface FluviaEventViewProps {
  event: AnomalyEvent;
  /** Refs `#NN` dentro de la narrativa → enfocar otro episodio. */
  onSelectRef: (id: number) => void;
  /** Abre el EventDetailPanel completo (superficie aparte). */
  onOpenDetail: () => void;
  /** Veredicto humano del operador. */
  onVerdict: (status: ReviewStatus) => void;
  /** Mutación en curso → deshabilita el veredicto. */
  verdictPending: boolean;
}

/** Separador inline de la tira meta (punto medio, decorativo). */
const MetaDot = () => (
  <span aria-hidden className="text-[var(--border-emphasis)]">
    ·
  </span>
);

/**
 * Contenido contextual del rail en modo «Evento #N»: meta del episodio,
 * narrativa real de FluvIA, señales implicadas, veredicto humano (si está
 * pendiente) y enlace al detalle completo (charts) en superficie aparte.
 */
export function FluviaEventView({ event, onSelectRef, onOpenDetail, onVerdict, verdictPending }: FluviaEventViewProps) {
  const open = event.closed_reason === null;
  const narrative = EVENT_NARRATIVES[event.id];
  const pending = event.review_status === 'pending_review';

  const narrativeMarkdown = narrative
    ? linkifyRefs(narrative.join('\n\n'))
    : `Episodio ${event.posible ? 'candidato (sub-umbral)' : 'confirmado'} iniciado a las **${fmtTimeShort(event.tiempo_inicio)}**. ` +
      `Primera señal anómala: **${event.sensores_involucrados[0] ?? 'sin señal registrada'}**.`;

  return (
    <div className="space-y-3">
      {/* meta del episodio: tira inline (lectura SCADA, sin caja) — el nivel y la
          navegación viven en la sub-cabecera; el estado de revisión, en el veredicto */}
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 font-readout text-xs text-[var(--text-secondary)]">
        <span>
          <b className="text-[var(--text-primary)]">{event.n_detecciones}</b> detecciones
        </span>
        <MetaDot />
        <span className={open ? 'font-medium text-[var(--status-critical)]' : 'text-[var(--text-primary)]'}>
          {open ? 'en curso' : fmtDuration(event.duracion_segundos)}
        </span>
        <MetaDot />
        <span className="inline-flex items-center gap-1.5">
          <span
            className={cn(
              'h-1.5 w-1.5 rounded-full',
              event.posible ? 'bg-[var(--status-warning)]' : 'bg-[var(--status-critical)]'
            )}
          />
          {event.posible ? 'Candidata' : 'Confirmada'}
        </span>
      </div>

      {/* narrativa real del evento */}
      <FluviaMarkdown markdown={narrativeMarkdown} onSelectRef={onSelectRef} />

      {/* señales implicadas */}
      {event.sensores_involucrados.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {event.sensores_involucrados.map((s) => (
            <Badge key={s} tag={s} />
          ))}
        </div>
      )}

      {/* veredicto humano */}
      {pending ? (
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Tu veredicto</p>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={verdictPending}
              onClick={() => onVerdict('confirmed_real')}
              className="justify-center border-[var(--status-critical)]/40 text-[var(--status-critical)] hover:bg-[var(--status-critical-muted)]"
            >
              <Check className="mr-1.5 h-3.5 w-3.5" />
              Anomalía real
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={verdictPending}
              onClick={() => onVerdict('dismissed_fp')}
              className="justify-center"
            >
              <X className="mr-1.5 h-3.5 w-3.5" />
              Falso positivo
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-xs text-[var(--text-secondary)]">
          Veredicto del operador:{' '}
          <b className="text-[var(--text-primary)]">
            {event.review_status === 'confirmed_real' ? 'anomalía real confirmada' : 'descartada como falso positivo'}
          </b>
          .
        </p>
      )}

      {/* superficie aparte: detalle completo (charts observado/esperado/residuo) */}
      <button
        type="button"
        onClick={onOpenDetail}
        className="inline-flex cursor-pointer items-center gap-1.5 rounded-sm text-xs font-medium text-[var(--text-link)] transition-colors hover:text-[var(--accent-primary)] hover:underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/40"
      >
        <Maximize2 className="h-3.5 w-3.5" />
        Ver detalle completo
      </button>
    </div>
  );
}
