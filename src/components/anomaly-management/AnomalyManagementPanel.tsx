import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
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
      <h1 className="sr-only">Gestión de anomalías</h1>
      <TabsList>
        <TabsTrigger value="events">Eventos</TabsTrigger>
        <TabsTrigger value="xai">Grafo XAI</TabsTrigger>
      </TabsList>

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
