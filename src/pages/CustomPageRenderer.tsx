import { Suspense, lazy, useCallback } from 'react';
import { useParams, Navigate } from 'react-router-dom';
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
import { LayoutDashboard } from 'lucide-react';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { CustomWidgetWrapper } from '@/components/custom-page/CustomWidgetWrapper';
import { CustomPageSidebar } from '@/components/custom-page/CustomPageSidebar';
import { useCustomPagesStore } from '@/stores/customPagesStore';
import { useTranslation } from '@/stores/languageStore';
import { resolveIcon } from '@/lib/iconResolver';

// Self-contained widgets (fetch their own data)
import { ProcessStatusChart, SensorTrendChart } from '@/components/dashboard';
import { AlertTimeline } from '@/components/network/AlertTimeline';

const TopologyGraph = lazy(() =>
  import('@/components/network/TopologyGraph').then((m) => ({ default: m.TopologyGraph }))
);

function WidgetFallback() {
  return (
    <div className="flex items-center justify-center py-8">
      <svg className="animate-spin h-5 w-5 text-[var(--accent-primary)]" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
      </svg>
    </div>
  );
}

// Wrapper widgets (thin data-fetching wrappers)
import { KPIStripWidget } from '@/components/custom-page/widgets/KPIStripWidget';
import { RadarWidget } from '@/components/custom-page/widgets/RadarWidget';
import { AnomalyScatterWidget } from '@/components/custom-page/widgets/AnomalyScatterWidget';
import { CalendarWidget } from '@/components/custom-page/widgets/CalendarWidget';
import { EventLogWidget } from '@/components/custom-page/widgets/EventLogWidget';
import { DevicesPieWidget } from '@/components/custom-page/widgets/DevicesPieWidget';
import { ProcessFlowWidget } from '@/components/custom-page/widgets/ProcessFlowWidget';

function renderWidget(widgetId: string) {
  switch (widgetId) {
    case 'kpi-strip':
      return <KPIStripWidget />;
    case 'radar':
      return <RadarWidget />;
    case 'process-status':
      return <ProcessStatusChart />;
    case 'anomaly-scatter':
      return <AnomalyScatterWidget />;
    case 'calendar':
      return <CalendarWidget />;
    case 'event-log':
      return <EventLogWidget />;
    case 'sensor-trend':
      return <SensorTrendChart />;
    case 'alert-timeline':
      return <AlertTimeline />;
    case 'topology':
      return (
        <Suspense fallback={<WidgetFallback />}>
          <TopologyGraph />
        </Suspense>
      );
    case 'devices-pie':
      return <DevicesPieWidget />;
    case 'process-flow':
      return <ProcessFlowWidget />;
    default:
      return null;
  }
}

export function CustomPageRenderer() {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useTranslation();
  const page = useCustomPagesStore((s) => (slug ? s.getPageBySlug(slug) : undefined));
  const reorderWidgets = useCustomPagesStore((s) => s.reorderWidgets);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      if (!page) return;
      const { active, over } = event;
      if (over && active.id !== over.id) {
        const oldIndex = page.widgets.findIndex((w) => w.id === active.id);
        const newIndex = page.widgets.findIndex((w) => w.id === over.id);
        if (oldIndex !== -1 && newIndex !== -1) {
          reorderWidgets(page.definition.id, oldIndex, newIndex);
        }
      }
    },
    [page, reorderWidgets],
  );

  if (!slug || !page || !page.definition.enabled) {
    return <Navigate to="/" replace />;
  }

  const { definition, widgets } = page;
  const PageIcon = resolveIcon(definition.icon);
  const widgetIds = widgets.map((w) => w.id);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <PageIcon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          {definition.name}
        </h1>
      </div>

      <div className="flex gap-4">
        <div className="flex-1 min-w-0">
          {widgets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-[var(--text-muted)]">
              <LayoutDashboard className="w-16 h-16 mb-4 opacity-30" />
              <p className="text-sm">{t('emptyPageHint')}</p>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={widgetIds} strategy={rectSortingStrategy}>
                <div className="grid grid-cols-2 gap-4">
                  {widgets.map((widget) => (
                    <CustomWidgetWrapper
                      key={widget.id}
                      pageId={definition.id}
                      id={widget.id}
                      size={widget.size}
                    >
                      <ErrorBoundary level="section">
                        {renderWidget(widget.id)}
                      </ErrorBoundary>
                    </CustomWidgetWrapper>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>

        <div className="w-72 shrink-0">
          <ErrorBoundary level="section">
            <CustomPageSidebar pageId={definition.id} />
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
}
