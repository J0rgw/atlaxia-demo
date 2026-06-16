import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { FileDown, FileSpreadsheet } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { rangeWindow } from '@/lib/anomalyEventsApi';
import { buildEventReportModel } from '@/lib/eventReport';
import { downloadEventReportPdf } from '@/lib/eventReportPdf';
import { buildEventsWorkbookData, downloadEventsExcel } from '@/lib/eventExportXlsx';
import { RANGE_NARRATIVES } from '@/data/fluviaNarrativesMock';
import { useAnomalyEvents } from '@/hooks/useAnomalyEvents';
import { useInstallation } from '@/hooks/useInstallation';
import { useAuthStore } from '@/stores/authStore';
import type { AnomalyEvent, AnomalyEventFilters, AnomalyEventRange } from '@/types';
import { Segmented } from '../Segmented';
import { EventsTimeline } from './EventsTimeline';
import { BentoSummary } from './BentoSummary';
import { EventsTable } from './EventsTable';
import { EventDetailPanel } from './EventDetailPanel';
import { HeaderFilter } from './HeaderFilter';
import { POSIBLE_OPTIONS, RANGE_OPTIONS, REVIEW_OPTIONS } from './filterOptions';

const DEFAULT_FILTERS: AnomalyEventFilters = {
  range: '24h',
  posible: 'all',
  review_status: 'all',
};

type ViewMode = 'summary' | 'table';

const toLocalInput = (ms: number) => format(new Date(ms), "yyyy-MM-dd'T'HH:mm");

/**
 * Tab «Eventos»: el timeline es el navegador permanente; debajo, el bento de
 * resumen de la franja (o la tabla) — y al seleccionar un episodio, su
 * investigación inline ocupa esa zona.
 */
export function AnomalyEventsTab() {
  const [filters, setFilters] = useState<AnomalyEventFilters>(DEFAULT_FILTERS);
  const [view, setView] = useState<ViewMode>('summary');
  const [selected, setSelected] = useState<AnomalyEvent | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState(false);
  const { installationName } = useInstallation();
  const session = useAuthStore((s) => s.session);

  // El resumen/timeline cuentan TODA la franja (sin filtros de estado); la
  // tabla aplica además posible/review. React Query dedupe por queryKey.
  const rangeQuery = useAnomalyEvents({ ...filters, posible: 'all', review_status: 'all' });
  const listQuery = useAnomalyEvents(filters);

  // El detalle muestra siempre la versión más fresca del episodio (tras un
  // PATCH la query se invalida y el objeto seleccionado quedaría obsoleto).
  const displayed = useMemo(() => {
    if (!selected) return null;
    return (
      rangeQuery.data?.events.find((e) => e.id === selected.id) ??
      listQuery.data?.events.find((e) => e.id === selected.id) ??
      selected
    );
  }, [selected, rangeQuery.data, listQuery.data]);

  const setRange = (range: AnomalyEventRange) => {
    if (range === 'custom') {
      // prefill con la ventana vigente para que el cambio no sea un salto
      const { from, to } = rangeWindow(filters);
      setFilters({
        ...filters,
        range,
        customFrom: new Date(from).toISOString(),
        customTo: new Date(to).toISOString(),
      });
    } else {
      setFilters({ ...filters, range });
    }
  };

  const customWindow = rangeWindow(filters);

  // Informe estructurado → PDF descargado directamente al navegador.
  // (En producto: render server-side en el BFF con la misma estructura.)
  const exportPdf = async () => {
    const events = rangeQuery.data?.events;
    if (!events || exporting) return;
    setExporting(true);
    setExportError(false);
    try {
      const model = buildEventReportModel({
        installationName,
        generatedBy: session?.username ?? 'operador',
        generatedAt: Date.now(),
        rangeLabel: RANGE_OPTIONS.find((o) => o.value === filters.range)?.label ?? filters.range,
        window: rangeWindow(filters),
        events,
        narrative: RANGE_NARRATIVES[filters.range]?.paragraphs,
      });
      await downloadEventReportPdf(model);
    } catch {
      setExportError(true);
    } finally {
      setExporting(false);
    }
  };

  // Export Excel de la tabla de episodios (+ hoja de anotaciones).
  const exportExcel = async () => {
    const events = rangeQuery.data?.events;
    if (!events || exporting) return;
    setExporting(true);
    setExportError(false);
    try {
      await downloadEventsExcel(buildEventsWorkbookData(events, installationName, Date.now()));
    } catch {
      setExportError(true);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 h-full min-h-0">
      {/* toolbar: rango global + (en resumen) filtros de estado + vista */}
      <div className="flex items-center gap-3 flex-wrap">
        <Segmented
          ariaLabel="Rango temporal"
          value={filters.range}
          onChange={setRange}
          options={RANGE_OPTIONS}
        />
        {filters.range === 'custom' && (
          <div className="flex items-center gap-1.5">
            <input
              type="datetime-local"
              aria-label="Inicio del rango"
              value={toLocalInput(customWindow.from)}
              onChange={(e) =>
                e.target.value &&
                setFilters({ ...filters, customFrom: new Date(e.target.value).toISOString() })
              }
              className="h-7 px-2 text-xs font-readout rounded-sm border border-[var(--border-default)] bg-[var(--bg-inset)] text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/40"
            />
            <span className="text-xs text-[var(--text-muted)]">→</span>
            <input
              type="datetime-local"
              aria-label="Fin del rango"
              value={toLocalInput(customWindow.to)}
              onChange={(e) =>
                e.target.value &&
                setFilters({ ...filters, customTo: new Date(e.target.value).toISOString() })
              }
              className="h-7 px-2 text-xs font-readout rounded-sm border border-[var(--border-default)] bg-[var(--bg-inset)] text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/40"
            />
          </div>
        )}

        {view === 'summary' && !displayed && (
          <>
            <HeaderFilter
              label="Sistema"
              variant="chip"
              options={POSIBLE_OPTIONS}
              value={filters.posible}
              defaultValue="all"
              onChange={(posible) => setFilters({ ...filters, posible })}
            />
            <HeaderFilter
              label="Revisión"
              variant="chip"
              options={REVIEW_OPTIONS}
              value={filters.review_status}
              defaultValue="all"
              onChange={(review_status) => setFilters({ ...filters, review_status })}
            />
          </>
        )}

        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs font-readout text-[var(--text-muted)]">
            {rangeQuery.data ? `${rangeQuery.data.total} episodios` : '—'}
          </span>
          {exportError && (
            <span role="alert" className="text-xs text-[var(--status-critical)]">
              Error al exportar
            </span>
          )}
          <Button
            size="sm"
            variant="secondary"
            onClick={exportPdf}
            disabled={!rangeQuery.data || exporting}
            title="Descarga el informe de la franja (auditoría / notificación de incidentes) en PDF"
          >
            <FileDown className="w-3.5 h-3.5 mr-1.5" />
            Informe PDF
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={exportExcel}
            disabled={!rangeQuery.data || exporting}
            title="Descarga la tabla de episodios de la franja en Excel (+ hoja de anotaciones)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" />
            Excel
          </Button>
          <Segmented
            ariaLabel="Vista del registro"
            value={view}
            onChange={setView}
            options={[
              { value: 'summary', label: 'Resumen' },
              { value: 'table', label: 'Tabla' },
            ]}
          />
        </div>
      </div>

      {/* navegador temporal — siempre visible; compacto en la vista de detalle */}
      <EventsTimeline
        events={rangeQuery.data?.events}
        isLoading={rangeQuery.isLoading}
        filters={filters}
        selectedId={displayed?.id ?? null}
        onSelect={setSelected}
        compact={displayed !== null}
      />

      {/* zona inferior: detalle del episodio ⇄ resumen/tabla */}
      {rangeQuery.isError ? (
        <div className="py-10 text-center text-sm text-[var(--status-critical)]">
          No se pudo cargar el registro de eventos.
        </div>
      ) : displayed ? (
        <EventDetailPanel key={displayed.id} event={displayed} onClose={() => setSelected(null)} />
      ) : view === 'summary' ? (
        <BentoSummary
          events={listQuery.data?.events}
          isLoading={listQuery.isLoading}
          filters={filters}
        />
      ) : (
        <Card padding="none" className="flex-1 min-h-0 flex flex-col">
          <div className="flex-1 min-h-0 overflow-auto scrollbar-thin">
            <EventsTable
              events={listQuery.data?.events}
              isLoading={listQuery.isLoading}
              filters={filters}
              onFiltersChange={setFilters}
              selectedId={null}
              onSelect={setSelected}
            />
          </div>
        </Card>
      )}
    </div>
  );
}
