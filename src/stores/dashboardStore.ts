import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TranslationKey } from '@/stores/languageStore';
import type { AnomalyData } from '@/types';

// --- Widget Registry ---

export type WidgetSize = 'full' | 'half';

export interface WidgetDefinition {
  id: string;
  titleKey: TranslationKey;
  icon: string;
  defaultSize: WidgetSize;
  /** If true, widget spans the full row and cannot be resized */
  fixedFull?: boolean;
}

export const WIDGET_REGISTRY: WidgetDefinition[] = [
  { id: 'kpi-strip', titleKey: 'systemStatus', icon: 'activity', defaultSize: 'full', fixedFull: true },
  { id: 'radar', titleKey: 'indicators', icon: 'radar', defaultSize: 'full' },
  { id: 'process-status', titleKey: 'processStatus', icon: 'bar-chart', defaultSize: 'full' },
  { id: 'anomaly-scatter', titleKey: 'anomalyDetection', icon: 'trending-up', defaultSize: 'full' },
  { id: 'calendar', titleKey: 'calendar', icon: 'calendar', defaultSize: 'half' },
  { id: 'event-log', titleKey: 'recentEvents', icon: 'list', defaultSize: 'half' },
];

export function getWidgetDef(id: string): WidgetDefinition | undefined {
  return WIDGET_REGISTRY.find((w) => w.id === id);
}

// --- Filters State ---

export type DateRangePreset = '24h' | '7d' | '30d' | 'custom';
export type AlertTypeFilter = 'all' | 'Emergencia' | 'Alerta' | 'Aviso';

export interface OverviewFilters {
  dateRange: DateRangePreset;
  customDateFrom: string | null;
  customDateTo: string | null;
  alertType: AlertTypeFilter;
  anomalyThreshold: number;
  autoRefresh: boolean;
}

export const DEFAULT_FILTERS: OverviewFilters = {
  dateRange: '24h',
  customDateFrom: null,
  customDateTo: null,
  alertType: 'all',
  anomalyThreshold: 0.7,
  autoRefresh: true,
};

export function getDateRange(filters: OverviewFilters) {
  const now = Date.now();
  const ranges: Record<string, number> = {
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
  };

  if (filters.dateRange === 'custom' && filters.customDateFrom) {
    return {
      startTs: new Date(filters.customDateFrom).getTime(),
      endTs: filters.customDateTo ? new Date(filters.customDateTo).getTime() : now,
      dateFrom: filters.customDateFrom,
      dateTo: filters.customDateTo || new Date(now).toISOString(),
    };
  }

  const ms = ranges[filters.dateRange] || ranges['24h'];
  return {
    startTs: now - ms,
    endTs: now,
    dateFrom: new Date(now - ms).toISOString(),
    dateTo: new Date(now).toISOString(),
  };
}

// --- Layout State ---

export interface WidgetLayout {
  id: string;
  size: WidgetSize;
}

/**
 * Cached calendar anomalies, persisted so a hard reload from any page can
 * show the last-known anomaly marks immediately while React Query re-fetches
 * in the background (SWR cold-render). Without this the user sees an empty
 * calendar for several hundred ms on every F5 — the original disappearing
 * bug.
 */
export interface CalendarAnomaliesSnapshot {
  anomalies: AnomalyData[];
  timestamp: number;
  /** Threshold used to build the snapshot. */
  threshold: number;
}

interface DashboardState {
  widgets: WidgetLayout[];
  editMode: boolean;
  filters: OverviewFilters;
  calendarSnapshot: CalendarAnomaliesSnapshot | null;
  setEditMode: (editing: boolean) => void;
  toggleEditMode: () => void;
  addWidget: (id: string) => void;
  removeWidget: (id: string) => void;
  reorderWidgets: (fromIndex: number, toIndex: number) => void;
  resetLayout: () => void;
  setWidgetSize: (id: string, size: WidgetSize) => void;
  setFilters: (partial: Partial<OverviewFilters>) => void;
  resetFilters: () => void;
  setCalendarSnapshot: (snapshot: CalendarAnomaliesSnapshot | null) => void;
}

export const DEFAULT_WIDGETS: WidgetLayout[] = [
  { id: 'kpi-strip', size: 'full' },
  { id: 'calendar', size: 'half' },
  { id: 'event-log', size: 'half' },
];

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set) => ({
      widgets: DEFAULT_WIDGETS,
      editMode: false,
      filters: DEFAULT_FILTERS,
      calendarSnapshot: null,

      setEditMode: (editing) => set({ editMode: editing }),
      toggleEditMode: () => set((s) => ({ editMode: !s.editMode })),

      addWidget: (id) =>
        set((s) => {
          if (s.widgets.some((w) => w.id === id)) return s;
          const def = getWidgetDef(id);
          return {
            widgets: [...s.widgets, { id, size: def?.defaultSize || 'full' }],
          };
        }),

      removeWidget: (id) =>
        set((s) => ({
          widgets: s.widgets.filter((w) => w.id !== id),
        })),

      reorderWidgets: (fromIndex, toIndex) =>
        set((s) => {
          const next = [...s.widgets];
          const [moved] = next.splice(fromIndex, 1);
          next.splice(toIndex, 0, moved);
          return { widgets: next };
        }),

      resetLayout: () => set({ widgets: DEFAULT_WIDGETS }),

      setWidgetSize: (id, size) =>
        set((s) => ({
          widgets: s.widgets.map((w) => (w.id === id ? { ...w, size } : w)),
        })),

      setFilters: (partial) =>
        set((s) => ({
          filters: { ...s.filters, ...partial },
        })),

      resetFilters: () => set({ filters: DEFAULT_FILTERS }),

      setCalendarSnapshot: (snapshot) => set({ calendarSnapshot: snapshot }),
    }),
    {
      name: 'atlaxia-dashboard-layout',
    }
  )
);
