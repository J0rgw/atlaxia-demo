import { useState } from 'react';
import { ChevronDown, ClipboardList, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/stores/authStore';
import { useAnnotateAnomalyEvent, useAssignAnomalyEvent } from '@/hooks/useAnomalyEvents';
import type { AnomalyEvent } from '@/types';
import { HeaderFilter } from './HeaderFilter';
import { fmtDateTime, fmtTimeShort } from './format';

interface EventManagementBoxProps {
  event: AnomalyEvent;
}

/** Plantilla de responsables (demo) — el real saldrá de los usuarios del BFF. */
const GESTORES = ['J. Pérez', 'M. García', 'A. Ruiz', 'Equipo SOC'] as const;
const UNASSIGNED = 'none';

const GESTOR_OPTIONS = [
  { value: UNASSIGNED, label: 'Sin asignar' },
  ...GESTORES.map((g) => ({ value: g, label: g })),
];

/**
 * Gestión humana del episodio: responsable gestor, fecha de abordaje y
 * anotaciones de quien interviene (técnico, supervisión, SOC). Es el rastro
 * que luego exporta el informe de auditoría.
 */
export function EventManagementBox({ event }: EventManagementBoxProps) {
  const [open, setOpen] = useState(true);
  const [draft, setDraft] = useState('');
  const session = useAuthStore((s) => s.session);
  const annotate = useAnnotateAnomalyEvent();
  const assign = useAssignAnomalyEvent();

  const author = session?.username ?? 'Operador';

  const submit = () => {
    const text = draft.trim();
    if (!text || annotate.isPending) return;
    annotate.mutate(
      { id: event.id, author, text },
      { onSuccess: () => setDraft('') }
    );
  };

  return (
    <div className="border border-[var(--border-subtle)] rounded-md bg-[var(--bg-surface)] p-3 min-h-0 flex flex-col">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/40 rounded-sm"
      >
        <ClipboardList className="w-3.5 h-3.5 text-[var(--accent-primary)] shrink-0" />
        <span className="text-sm font-bold text-[var(--text-primary)]">Gestión del episodio</span>
        <span className="font-readout text-[10px] text-[var(--text-muted)]">
          {event.gestor ?? 'sin asignar'} · {event.anotaciones.length}{' '}
          {event.anotaciones.length === 1 ? 'nota' : 'notas'}
        </span>
        <ChevronDown
          className={cn(
            'w-3.5 h-3.5 text-[var(--text-secondary)] ml-auto shrink-0 transition-transform',
            !open && '-rotate-90'
          )}
        />
      </button>

      {open && (
        <div className="mt-2.5 space-y-2.5 min-h-0 flex flex-col">
          <div className="flex items-center gap-x-4 gap-y-2 flex-wrap">
            <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider">
              Responsable
            </span>
            <HeaderFilter
              label="Gestor"
              variant="chip"
              options={GESTOR_OPTIONS}
              value={event.gestor ?? UNASSIGNED}
              defaultValue={UNASSIGNED}
              onChange={(value) =>
                assign.mutate({ id: event.id, gestor: value === UNASSIGNED ? null : value })
              }
            />
            <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider">
              Abordado
            </span>
            <span className="font-readout text-xs text-[var(--text-primary)]">
              {event.abordado_at ? fmtDateTime(event.abordado_at) : '—'}
            </span>
          </div>

          {event.anotaciones.length > 0 && (
            <div className="max-h-32 overflow-auto scrollbar-thin divide-y divide-[var(--border-subtle)] border border-[var(--border-subtle)] rounded-sm">
              {event.anotaciones.map((a) => (
                <div key={a.id} className="px-2.5 py-1.5">
                  <p className="font-readout text-[10px] text-[var(--text-muted)]">
                    <b className="text-[var(--text-secondary)]">{a.author}</b> ·{' '}
                    {fmtTimeShort(a.created_at)}
                  </p>
                  <p className="text-xs text-[var(--text-primary)] leading-snug">{a.text}</p>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              placeholder={`Añadir anotación como ${author}…`}
              aria-label="Nueva anotación"
              className="flex-1 h-8 text-xs"
            />
            <Button
              size="sm"
              variant="secondary"
              disabled={!draft.trim() || annotate.isPending}
              onClick={submit}
            >
              <Send className="w-3.5 h-3.5 mr-1.5" />
              Anotar
            </Button>
          </div>
          {(annotate.isError || assign.isError) && (
            <p role="alert" className="text-xs text-[var(--status-critical)]">
              No se pudo guardar el cambio. Inténtalo de nuevo.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
