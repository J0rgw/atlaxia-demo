import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X, Maximize2, Minimize2 } from 'lucide-react';

export type WidgetSize = 'full' | 'half';

interface PageWidgetWrapperProps {
  id: string;
  size: WidgetSize;
  editMode: boolean;
  canResize?: boolean;
  onRemove?: (id: string) => void;
  onResize?: (id: string, size: WidgetSize) => void;
  children: React.ReactNode;
}

export function PageWidgetWrapper({
  id,
  size,
  editMode,
  canResize = true,
  onRemove,
  onResize,
  children,
}: PageWidgetWrapperProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: !editMode });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative ${size === 'full' ? 'col-span-2' : 'col-span-1'} ${
        editMode ? 'ring-2 ring-dashed ring-primary-400/50 rounded-md' : ''
      }`}
    >
      {editMode && (
        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-full px-1.5 py-0.5 shadow-sm">
          <button
            {...attributes}
            {...listeners}
            className="p-0.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] dark:hover:text-[var(--text-secondary)] cursor-grab active:cursor-grabbing"
          >
            <GripVertical className="w-3.5 h-3.5" />
          </button>

          {canResize && onResize && (
            <button
              onClick={() => onResize(id, size === 'full' ? 'half' : 'full')}
              className="p-0.5 text-[var(--text-muted)] hover:text-primary-500 dark:hover:text-primary-400"
              title={size === 'full' ? 'Half width' : 'Full width'}
            >
              {size === 'full' ? (
                <Minimize2 className="w-3.5 h-3.5" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5" />
              )}
            </button>
          )}

          {onRemove && (
            <button
              onClick={() => onRemove(id)}
              className="p-0.5 text-[var(--text-muted)] hover:text-[var(--status-critical)]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
      {children}
    </div>
  );
}
