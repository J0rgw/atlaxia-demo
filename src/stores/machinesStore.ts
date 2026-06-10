import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type WidgetSize = 'full' | 'half';

export interface WidgetLayout {
  id: string;
  size: WidgetSize;
}

type ViewMode = 'cards' | 'charts';

interface MachinesState {
  widgets: WidgetLayout[];
  editMode: boolean;
  viewMode: ViewMode;
  selectedProcess: string | null;
  showDiagnostics: boolean;

  setEditMode: (editing: boolean) => void;
  toggleEditMode: () => void;
  setViewMode: (mode: ViewMode) => void;
  setSelectedProcess: (process: string | null) => void;
  toggleSelectedProcess: (process: string) => void;
  setShowDiagnostics: (show: boolean) => void;
  toggleDiagnostics: () => void;

  reorderWidgets: (fromIndex: number, toIndex: number) => void;
  setWidgets: (widgets: WidgetLayout[]) => void;
  setWidgetSize: (id: string, size: WidgetSize) => void;
  removeWidget: (id: string) => void;
  resetLayout: (widgets: WidgetLayout[]) => void;
}

export const useMachinesStore = create<MachinesState>()(
  persist(
    (set) => ({
      widgets: [],
      editMode: false,
      viewMode: 'cards',
      selectedProcess: null,
      showDiagnostics: false,

      setEditMode: (editing) => set({ editMode: editing }),
      toggleEditMode: () => set((s) => ({ editMode: !s.editMode })),
      setViewMode: (mode) => set({ viewMode: mode }),
      setSelectedProcess: (process) => set({ selectedProcess: process }),
      toggleSelectedProcess: (process) =>
        set((s) => ({
          selectedProcess: s.selectedProcess === process ? null : process,
        })),
      setShowDiagnostics: (show) => set({ showDiagnostics: show }),
      toggleDiagnostics: () => set((s) => ({ showDiagnostics: !s.showDiagnostics })),

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
      name: 'atlaxia-machines-layout',
    }
  )
);
