import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { AnomalyEvent } from '@/types';
import { EventDetailPanel } from './EventDetailPanel';

interface EventDetailDialogProps {
  /** Episodio a inspeccionar, o null = cerrado. */
  event: AnomalyEvent | null;
  onClose: () => void;
}

/**
 * Superficie aparte del registro: el `EventDetailPanel` completo (gráficas
 * observado/esperado/residuo) en un diálogo modal acotado, alcanzable desde el
 * modo «Evento #N» del copiloto. Columna flex con tope de viewport para que el
 * panel (que reparte altura con `flex-1 min-h-0`) y sus gráficas scrolleen
 * dentro del modal.
 */
export function EventDetailDialog({ event, onClose }: EventDetailDialogProps) {
  return (
    <DialogPrimitive.Root open={event !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-modal-scrim bg-black/40 backdrop-blur-[1px] transition-opacity duration-200 data-[state=closed]:opacity-0 data-[state=open]:opacity-100" />
        <DialogPrimitive.Content
          // El EventDetailPanel gestiona su propio foco (mueve al panel al abrir).
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="fixed left-1/2 top-1/2 z-modal flex max-h-[88vh] w-[min(960px,94vw)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-base)] p-4 shadow-card focus:outline-none"
        >
          <DialogPrimitive.Title className="sr-only">
            Detalle del episodio{event ? ` #${event.id}` : ''}
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            Gráficas observado/esperado/residuo y gestión del episodio.
          </DialogPrimitive.Description>

          {event && <EventDetailPanel key={event.id} event={event} onClose={onClose} />}

          <DialogPrimitive.Close
            aria-label="Cerrar detalle"
            className="absolute right-2 top-2 rounded-sm p-1 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-inset)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/40"
          >
            <X className="h-4 w-4" />
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
