import { useMemo, useCallback, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import {
  KPICard,
  CalendarWithDetail,
  EventLog,
  ProcessCriticalityGauge,
  AnomalyScatterChart,
} from '@/components/dashboard';
import { WidgetWrapper } from '@/components/dashboard/WidgetWrapper';
import { RadarChart } from '@/components/control';
import { FiltersPanel } from '@/components/filters';
import { Card, CardContent } from '@/components/ui/Card';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { Skeleton } from '@/components/ui/Skeleton';
import { useControlIndicators, useActiveAlarms, useCalendarAnomalies } from '@/hooks/useOverviewData';
import { useNetworkAlerts } from '@/hooks/useNetwork';
import { useInferenceHealthSummary } from '@/hooks/useInference';
import { useTranslation } from '@/stores/languageStore';
import { useDashboardStore, getDateRange } from '@/stores/dashboardStore';
import { useTelemetryContext } from '@/contexts/TelemetryContext';
import { useDevicesOnline } from '@/hooks/useDevicesOnline';
import {
  buildPipelineHealthKPI,
  buildAlarmsKPI,
  buildCriticalityKPI,
  buildDevicesKPI,
  buildEventLog,
  buildCalendarAnomalies,
} from '@/lib/widgetTransforms';
import type { KPIData } from '@/types';

const SKELETON_KPI: KPIData = {
  id: 'skeleton',
  icon: 'efficiency',
  title: '',
  value: '',
  variant: 'neutral',
  loading: true,
};

export function OverviewPage() {
  const { t } = useTranslation();
  const widgets = useDashboardStore((s) => s.widgets);
  const reorderWidgets = useDashboardStore((s) => s.reorderWidgets);
  const filters = useDashboardStore((s) => s.filters);
  const calendarSnapshot = useDashboardStore((s) => s.calendarSnapshot);
  const setCalendarSnapshot = useDashboardStore((s) => s.setCalendarSnapshot);
  const { latestInferenceByModel } = useTelemetryContext();

  const stableDateRange = useMemo(
    () => getDateRange(filters),
    [filters],
  );

  const refetch = useCallback(
    (ms: number): number | false => (filters.autoRefresh ? ms : false),
    [filters.autoRefresh],
  );

  // Data hooks
  const controlQuery = useControlIndicators(refetch(15000));
  const pipelineHealthQuery = useInferenceHealthSummary(refetch(30000));
  const alarmsQuery = useActiveAlarms(refetch(10000));
  const calendarAnomaliesQuery = useCalendarAnomalies(
    filters.anomalyThreshold,
    refetch(30000),
  );
  const devicesOnline = useDevicesOnline();
  const networkAlertsQuery = useNetworkAlerts(
    {
      limit: 200,
      alertType: filters.alertType === 'all' ? undefined : filters.alertType,
      dateFrom: stableDateRange.dateFrom,
      dateTo: stableDateRange.dateTo,
    },
    refetch(10000),
  );

  // Separate, UNFILTERED feed for the Ciberseguridad axis. The user-facing
  // event log respects the filter (Emergencia / Alerta / Aviso); the cyber
  // health metric must not — it's a fixed plant-security measurement and
  // would otherwise look "safer" just because the operator filtered the view.
  const cyberAlertsQuery = useNetworkAlerts({ limit: 200 }, refetch(30000));

  // Live Ciberseguridad axis derived from the IDS feed (Snort → BFF network
  // alerts). 1 = safe, 0 = saturated. Saturation point is set generously
  // (20 emergencies/hour) because real plant traffic rarely exceeds a handful.
  const cyberHealth = useMemo<number | null>(() => {
    const alerts = cyberAlertsQuery.data?.alerts;
    if (!alerts) return null;
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const recentEmergencies = alerts.filter(
      (a) => a.timestamp >= oneHourAgo && a.type === 'Emergencia',
    ).length;
    const recentAlerts = alerts.filter(
      (a) => a.timestamp >= oneHourAgo && a.type === 'Alerta',
    ).length;
    // Emergencias pesan x3 frente a alertas; saturación lineal a 20.
    const weighted = recentEmergencies * 3 + recentAlerts;
    return Math.max(0, 1 - Math.min(1, weighted / 20));
  }, [cyberAlertsQuery.data?.alerts]);

  // Stash the latest successful anomalies fetch so an F5 from any other page
  // can paint the calendar immediately while React Query re-fetches in the
  // background. Without this, the marks disappear on every cold render.
  useEffect(() => {
    const data = calendarAnomaliesQuery.data;
    if (!data) return;
    setCalendarSnapshot({
      anomalies: data.anomalies
        .filter((a) => a.isAnomaly)
        .map((a) => ({ ...a, timestamp: data.timestamp })),
      timestamp: data.timestamp,
      threshold: filters.anomalyThreshold,
    });
  }, [calendarAnomaliesQuery.data, filters.anomalyThreshold, setCalendarSnapshot]);

  // Drag & Drop
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (over && active.id !== over.id) {
        const oldIndex = widgets.findIndex((w) => w.id === active.id);
        const newIndex = widgets.findIndex((w) => w.id === over.id);
        if (oldIndex !== -1 && newIndex !== -1) {
          reorderWidgets(oldIndex, newIndex);
        }
      }
    },
    [widgets, reorderWidgets],
  );

  // Pick the first model alphabetically — multi-model dropdown is future work.
  const primaryInference = useMemo(() => {
    const names = Object.keys(latestInferenceByModel).sort();
    return names.length > 0 ? latestInferenceByModel[names[0]] : null;
  }, [latestInferenceByModel]);

  // KPIs — built from shared transforms; null entries render as skeleton.
  const kpis = useMemo(() => [
    pipelineHealthQuery.data ? buildPipelineHealthKPI(pipelineHealthQuery.data, t) : null,
    primaryInference !== null || !controlQuery.isLoading
      ? buildCriticalityKPI(primaryInference, t)
      : null,
    alarmsQuery.data ? buildAlarmsKPI(alarmsQuery.data, t) : null,
    devicesOnline.status === 'ready'
      ? buildDevicesKPI(
          { online: devicesOnline.online, total: devicesOnline.total, ready: true },
          t,
        )
      : null,
  ], [pipelineHealthQuery.data, controlQuery.isLoading, primaryInference, alarmsQuery.data, devicesOnline, t]);

  // Calendar data — prefer the live query; fall back to the persisted snapshot
  // when a cold render arrives before React Query resolves.
  const calendarAnomalies = useMemo(() => {
    const live = calendarAnomaliesQuery.data
      ? buildCalendarAnomalies(calendarAnomaliesQuery.data)
      : [];
    if (live.length > 0) return live;
    if (calendarSnapshot && calendarSnapshot.threshold === filters.anomalyThreshold) {
      return calendarSnapshot.anomalies;
    }
    return [];
  }, [calendarAnomaliesQuery.data, calendarSnapshot, filters.anomalyThreshold]);

  const calendarAlerts = useMemo(() => {
    if (!networkAlertsQuery.data?.alerts) return [];
    return networkAlertsQuery.data.alerts;
  }, [networkAlertsQuery.data]);

  const calendarIsLoading =
    calendarAnomaliesQuery.isLoading &&
    !calendarAnomaliesQuery.data &&
    calendarSnapshot === null;

  // Event log — merged alarms + network alerts
  const events = useMemo(
    () => buildEventLog(alarmsQuery.data?.alarms, networkAlertsQuery.data?.alerts),
    [alarmsQuery.data, networkAlertsQuery.data],
  );
  const eventLogIsLoading =
    (alarmsQuery.isLoading && !alarmsQuery.data) ||
    (networkAlertsQuery.isLoading && !networkAlertsQuery.data);

  const anomalyScatterIsLoading =
    calendarAnomaliesQuery.isLoading && !calendarAnomaliesQuery.data;

  // Widget renderer
  const renderWidget = (widgetId: string) => {
    switch (widgetId) {
      case 'kpi-strip':
        return (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {kpis.map((kpi, idx) => (
              <KPICard key={kpi?.id ?? `skeleton-${idx}`} data={kpi ?? SKELETON_KPI} />
            ))}
          </div>
        );

      case 'radar':
        return (
          <Card padding="none">
            <div className="px-4 pt-3 pb-1 flex items-center gap-3 border-b border-[var(--border-subtle)]/40">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wide">
                {t('indicators')}
              </h3>
            </div>
            <CardContent className="p-2">
              <div className="h-72">
                {controlQuery.isLoading && !controlQuery.data ? (
                  <Skeleton.Bar className="h-full w-full" rounded="lg" />
                ) : controlQuery.isError ? (
                  <div className="h-full flex items-center justify-center text-sm text-[var(--status-critical)]">
                    {t('loadTelemetryError')}
                  </div>
                ) : controlQuery.data?.indicators ? (
                  <RadarChart
                    data={{
                      ...controlQuery.data.indicators,
                      // Override Ciberseguridad with the IDS-derived value when
                      // the alerts feed has resolved — that one we know is
                      // ground-truth (Snort → BFF), not a backend rollup.
                      ciberseguridad:
                        cyberHealth ?? controlQuery.data.indicators.ciberseguridad,
                      timestamp: controlQuery.data.timestamp,
                    }}
                    compact
                  />
                ) : (
                  <div className="h-full flex items-center justify-center text-sm text-[var(--text-muted)]">
                    {t('noData')}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );

      case 'process-status':
        return <ProcessCriticalityGauge />;

      case 'anomaly-scatter':
        return anomalyScatterIsLoading ? (
          <Card padding="none">
            <div className="px-4 pt-3 pb-1 flex items-center gap-3 border-b border-[var(--border-subtle)]/40">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wide">
                {t('anomalyDetection')}
              </h3>
            </div>
            <CardContent className="p-2">
              <Skeleton.Bar className="h-72 w-full" rounded="lg" />
            </CardContent>
          </Card>
        ) : (
          <AnomalyScatterChart
            anomalies={calendarAnomaliesQuery.data?.anomalies || []}
            threshold={filters.anomalyThreshold}
            anomalyCount={calendarAnomaliesQuery.data?.anomalyCount}
          />
        );

      case 'calendar':
        return calendarIsLoading ? (
          <Card className="h-full">
            <CardContent>
              <div className="grid grid-cols-7 gap-1 mb-2">
                {Array.from({ length: 7 }).map((_, i) => (
                  <Skeleton.Bar key={i} className="h-5" />
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: 35 }).map((_, i) => (
                  <Skeleton.Bar key={i} className="aspect-square" rounded="lg" />
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <CalendarWithDetail
            anomalies={calendarAnomalies}
            alerts={calendarAlerts}
          />
        );

      case 'event-log':
        return eventLogIsLoading ? (
          <Card padding="none" className="h-full flex flex-col">
            <div className="px-4 pt-3 pb-2 border-b border-[var(--border-subtle)]/40">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wide">
                {t('recentApiLogs')}
              </h3>
            </div>
            <CardContent className="flex-1 overflow-auto">
              <div className="divide-y divide-[var(--border-subtle)]">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                    <Skeleton.Bar className="w-2 h-2 rounded-full shrink-0" rounded="full" />
                    <div className="flex-1 space-y-1">
                      <Skeleton.Bar className="h-3 w-48" />
                      <Skeleton.Bar className="h-2 w-16" />
                    </div>
                    <Skeleton.Bar className="h-4 w-12" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <EventLog events={events} />
        );

      default:
        return null;
    }
  };

  const widgetIds = widgets.map((w) => w.id);

  return (
    <div className="flex gap-4">
      <div className="flex-1 min-w-0">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={widgetIds} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-2 gap-4">
              {widgets.map((widget) => (
                <WidgetWrapper key={widget.id} id={widget.id} size={widget.size}>
                  <ErrorBoundary level="section">
                    {renderWidget(widget.id)}
                  </ErrorBoundary>
                </WidgetWrapper>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      <div className="w-72 shrink-0">
        <ErrorBoundary level="section">
          <FiltersPanel />
        </ErrorBoundary>
      </div>
    </div>
  );
}
