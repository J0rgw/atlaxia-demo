import { Check, Maximize2, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { processChipOf } from '@/lib/anomalyEventsInsights';
import { REVIEW_STATUS_CONFIG } from '@/lib/statusStyles';
import { EVENT_NARRATIVES } from '@/data/fluviaNarrativesMock';
import type { AnomalyEvent, ReviewStatus } from '@/types';
import { cn } from '@/lib/utils';
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

function MetaCell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[9px] font-medium uppercase tracking-wider text-[var(--text-muted)]">{label}</p>
      <p className="truncate font-readout text-xs text-[var(--text-primary)]">{children}</p>
    </div>
  );
}

/**
 * Contenido contextual del rail en modo «Evento #N»: meta del episodio,
 * narrativa real de FluvIA, señales implicadas, veredicto humano (si está
 * pendiente) y enlace al detalle completo (charts) en superficie aparte.
 */
export function FluviaEventView({ event, onSelectRef, onOpenDetail, onVerdict, verdictPending }: FluviaEventViewProps) {
  const open = event.closed_reason === null;
  const narrative = EVENT_NARRATIVES[event.id];
  const pending = event.review_status === 'pending_review';
  const review = REVIEW_STATUS_CONFIG[event.review_status];

  const narrativeMarkdown = narrative
    ? linkifyRefs(narrative.join('\n\n'))
    : `Episodio ${event.posible ? 'candidato (sub-umbral)' : 'confirmado'} iniciado a las **${fmtTimeShort(event.tiempo_inicio)}**. ` +
      `Primera señal anómala: **${event.sensores_involucrados[0] ?? 'sin señal registrada'}**.`;

  return (
    <div className="space-y-3">
      {/* meta del episodio */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-2 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3">
        <MetaCell label="Detecciones">{event.n_detecciones}</MetaCell>
        <MetaCell label="Duración">{open ? 'en curso' : fmtDuration(event.duracion_segundos)}</MetaCell>
        <MetaCell label="Sistema">
          <span className={cn(event.posible ? 'text-[var(--status-warning)]' : 'text-[var(--status-critical)]')}>
            {event.posible ? 'Candidata' : 'Confirmada'}
          </span>
        </MetaCell>
        <MetaCell label="Revisión">
          <span className={cn('inline-flex px-1.5 text-[10px] font-medium', review.badge)}>{review.label}</span>
        </MetaCell>
      </div>

      {/* narrativa real del evento */}
      <FluviaMarkdown markdown={narrativeMarkdown} onSelectRef={onSelectRef} />

      {/* señales implicadas */}
      {event.sensores_involucrados.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {event.sensores_involucrados.map((s) => {
            const chip = processChipOf(s);
            return (
              <span
                key={s}
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-0.5 font-readout text-[10px] text-[var(--text-secondary)]"
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: chip?.color ?? 'var(--border-default)' }}
                />
                {s}
              </span>
            );
          })}
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
