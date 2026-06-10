import { PageWidgetWrapper } from '@/components/ui/PageWidgetWrapper';
import { useDashboardStore, getWidgetDef } from '@/stores/dashboardStore';
import type { WidgetSize } from '@/stores/dashboardStore';

interface WidgetWrapperProps {
  id: string;
  size: WidgetSize;
  children: React.ReactNode;
}

export function WidgetWrapper({ id, size, children }: WidgetWrapperProps) {
  const editMode = useDashboardStore((s) => s.editMode);
  const removeWidget = useDashboardStore((s) => s.removeWidget);
  const setWidgetSize = useDashboardStore((s) => s.setWidgetSize);

  const def = getWidgetDef(id);
  const canResize = !def?.fixedFull;

  return (
    <PageWidgetWrapper
      id={id}
      size={size}
      editMode={editMode}
      canResize={canResize}
      onRemove={removeWidget}
      onResize={setWidgetSize}
    >
      {children}
    </PageWidgetWrapper>
  );
}
