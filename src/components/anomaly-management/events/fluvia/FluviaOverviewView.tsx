import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { FluviaMarkdown } from './FluviaMarkdown';
import type { OverviewModel } from './overview';

interface FluviaOverviewViewProps {
  model: OverviewModel | null;
  isLoading: boolean;
  onSelectRef: (id: number) => void;
  /** Entra a revisar el primer episodio uno a uno. */
  onReview: () => void;
  /** Hay episodios que revisar. */
  canReview: boolean;
}

/**
 * Contenido contextual del rail en modo «Visión general»: resumen IA del
 * periodo en markdown navegable (refs `#NN` clicables) + CTA para revisar los
 * episodios uno a uno.
 */
export function FluviaOverviewView({ model, isLoading, onSelectRef, onReview, canReview }: FluviaOverviewViewProps) {
  if (!model) {
    return (
      <p className="text-xs italic text-[var(--text-muted)]">
        {isLoading ? 'Analizando el periodo…' : 'Sin datos del periodo.'}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <FluviaMarkdown markdown={model.markdown} onSelectRef={onSelectRef} />

      {canReview && (
        <Button variant="primary" size="sm" className="w-full justify-between" onClick={onReview}>
          Revisar eventos uno a uno
          <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}
