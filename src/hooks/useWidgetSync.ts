import { useEffect } from 'react';
import type { WidgetLayout } from '@/stores/machinesStore';

/**
 * Syncs a widget list with the currently selected sensor keys,
 * preserving existing order and appending new selections.
 */
export function useWidgetSync(
  selectedSensorKeys: string[],
  widgets: WidgetLayout[],
  setWidgets: (widgets: WidgetLayout[]) => void,
  enabled = true
) {
  useEffect(() => {
    if (!enabled) return;

    const currentIds = new Set(widgets.map((w) => w.id));
    const selectedIds = new Set(selectedSensorKeys);

    const needsUpdate =
      selectedSensorKeys.some((k) => !currentIds.has(k)) ||
      widgets.some((w) => !selectedIds.has(w.id));

    if (needsUpdate) {
      const existingOrder = widgets.filter((w) => selectedIds.has(w.id));
      const existingIds = new Set(existingOrder.map((w) => w.id));
      const newWidgets = selectedSensorKeys
        .filter((k) => !existingIds.has(k))
        .map((k) => ({ id: k, size: 'full' as const }));
      setWidgets([...existingOrder, ...newWidgets]);
    }
  }, [selectedSensorKeys, widgets, setWidgets, enabled]);
}
