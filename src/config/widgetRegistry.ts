import type { TranslationKey } from '@/stores/languageStore';

export type WidgetSize = 'full' | 'half';
export type WidgetCategory = 'dashboard' | 'network' | 'anomalies' | 'control' | 'process';

export interface ExtendedWidgetDefinition {
  id: string;
  titleKey: TranslationKey;
  icon: string;
  defaultSize: WidgetSize;
  fixedFull?: boolean;
  category: WidgetCategory;
}

export const EXTENDED_WIDGET_REGISTRY: ExtendedWidgetDefinition[] = [
  // Dashboard
  { id: 'kpi-strip', titleKey: 'systemStatus', icon: 'activity', defaultSize: 'full', fixedFull: true, category: 'dashboard' },
  { id: 'process-status', titleKey: 'processStatus', icon: 'bar-chart', defaultSize: 'full', category: 'dashboard' },
  { id: 'sensor-trend', titleKey: 'sensorTrends', icon: 'trending-up', defaultSize: 'full', category: 'dashboard' },
  { id: 'calendar', titleKey: 'calendar', icon: 'calendar', defaultSize: 'half', category: 'dashboard' },
  { id: 'event-log', titleKey: 'recentEvents', icon: 'list', defaultSize: 'half', category: 'dashboard' },

  // Control
  { id: 'radar', titleKey: 'indicators', icon: 'radar', defaultSize: 'full', category: 'control' },

  // Anomalies
  { id: 'anomaly-scatter', titleKey: 'anomalyDetection', icon: 'trending-up', defaultSize: 'full', category: 'anomalies' },

  // Network
  { id: 'alert-timeline', titleKey: 'alertTimeline', icon: 'bar-chart', defaultSize: 'full', category: 'network' },
  { id: 'topology', titleKey: 'sniffer', icon: 'network', defaultSize: 'full', fixedFull: true, category: 'network' },
  { id: 'devices-pie', titleKey: 'deviceDistribution', icon: 'pie-chart', defaultSize: 'half', category: 'network' },

  // Process
  { id: 'process-flow', titleKey: 'processStatus', icon: 'layers', defaultSize: 'full', fixedFull: true, category: 'process' },
];

export const WIDGET_CATEGORY_LABELS: Record<WidgetCategory, { es: string; en: string }> = {
  dashboard: { es: 'Dashboard', en: 'Dashboard' },
  control: { es: 'Control', en: 'Control' },
  anomalies: { es: 'Anomalias', en: 'Anomalies' },
  network: { es: 'Red', en: 'Network' },
  process: { es: 'Procesos', en: 'Process' },
};

export function getExtendedWidgetDef(id: string): ExtendedWidgetDefinition | undefined {
  return EXTENDED_WIDGET_REGISTRY.find((w) => w.id === id);
}
