import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { LiveIndicator } from '@/components/dashboard/LiveIndicator';
import { AnomalyEventsTab } from './events/AnomalyEventsTab';
import { XaiGraphTab } from './xai/XaiGraphTab';

/**
 * Gestión de Anomalías: panel a página completa con dos vistas —
 * el registro de episodios (anomaly-event-register) y la explicabilidad
 * del evento sobre el grafo aprendido (Grafo XAI).
 */
export function AnomalyManagementPanel() {
  return (
    <Tabs defaultValue="events" className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between gap-3">
        <TabsList className="flex-1">
          <TabsTrigger value="events">Eventos</TabsTrigger>
          <TabsTrigger value="xai">Grafo XAI</TabsTrigger>
        </TabsList>
        <LiveIndicator isLive className="mb-1" />
      </div>

      <TabsContent value="events" className="flex-1 min-h-0 pt-3">
        <ErrorBoundary level="section">
          <AnomalyEventsTab />
        </ErrorBoundary>
      </TabsContent>
      <TabsContent value="xai" className="flex-1 min-h-0 pt-3">
        <ErrorBoundary level="section">
          <XaiGraphTab />
        </ErrorBoundary>
      </TabsContent>
    </Tabs>
  );
}
