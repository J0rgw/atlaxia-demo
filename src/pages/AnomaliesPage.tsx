import { AnomalyManagementPanel } from '@/components/anomaly-management';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

/**
 * Página de anomalías: panel de Gestión de Anomalías a altura completa
 * (registro de eventos + Grafo XAI), sin cabecera de página — todo el hueco
 * es del panel. La tabla live por sensor (components/anomalies/AnomaliesTable)
 * queda fuera de esta página tras el rediseño — el componente sigue
 * disponible para recolocarla si se decide.
 */
export function AnomaliesPage() {
  return (
    <div className="h-[calc(100vh-var(--header-height)-32px)] min-h-[520px]">
      <ErrorBoundary level="section">
        <AnomalyManagementPanel />
      </ErrorBoundary>
    </div>
  );
}
