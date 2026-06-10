import { PageWidgetWrapper } from '@/components/ui/PageWidgetWrapper';
import { useCustomPagesStore } from '@/stores/customPagesStore';
import { getExtendedWidgetDef } from '@/config/widgetRegistry';
import type { CustomPageId } from '@/types/customPages';
import type { WidgetSize } from '@/components/ui/PageWidgetWrapper';

interface CustomWidgetWrapperProps {
  pageId: CustomPageId;
  id: string;
  size: WidgetSize;
  children: React.ReactNode;
}

export function CustomWidgetWrapper({ pageId, id, size, children }: CustomWidgetWrapperProps) {
  const editingPageId = useCustomPagesStore((s) => s.editingPageId);
  const removeWidget = useCustomPagesStore((s) => s.removeWidget);
  const setWidgetSize = useCustomPagesStore((s) => s.setWidgetSize);

  const editMode = editingPageId === pageId;
  const def = getExtendedWidgetDef(id);
  const canResize = !def?.fixedFull;

  return (
    <PageWidgetWrapper
      id={id}
      size={size}
      editMode={editMode}
      canResize={canResize}
      onRemove={(wId) => removeWidget(pageId, wId)}
      onResize={(wId, sz) => setWidgetSize(pageId, wId, sz)}
    >
      {children}
    </PageWidgetWrapper>
  );
}
