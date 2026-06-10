import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type WidgetSize = 'full' | 'half';

export interface WidgetLayout {
  id: string;
  size: WidgetSize;
}

interface VariablesState {
  widgets: WidgetLayout[];
  editMode: boolean;

  setEditMode: (editing: boolean) => void;
  toggleEditMode: () => void;

  reorderWidgets: (fromIndex: number, toIndex: number) => void;
  setWidgets: (widgets: WidgetLayout[]) => void;
  setWidgetSize: (id: string, size: WidgetSize) => void;
  removeWidget: (id: string) => void;
  resetLayout: (widgets: WidgetLayout[]) => void;
}

export const useVariablesStore = create<VariablesState>()(
  persist(
    (set) => ({
      widgets: [],
      editMode: false,

      setEditMode: (editing) => set({ editMode: editing }),
      toggleEditMode: () => set((s) => ({ editMode: !s.editMode })),

      reorderWidgets: (fromIndex, toIndex) =>
        set((s) => {
          const next = [...s.widgets];
          const [moved] = next.splice(fromIndex, 1);
          next.splice(toIndex, 0, moved);
          return { widgets: next };
        }),

      setWidgets: (widgets) => set({ widgets }),

      setWidgetSize: (id, size) =>
        set((s) => ({
          widgets: s.widgets.map((w) => (w.id === id ? { ...w, size } : w)),
        })),

      removeWidget: (id) =>
        set((s) => ({
          widgets: s.widgets.filter((w) => w.id !== id),
        })),

      resetLayout: (widgets) => set({ widgets }),
    }),
    {
      name: 'atlaxia-variables-layout',
    }
  )
);
