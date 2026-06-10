import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CustomPageId, CustomPageDefinition, CustomPageState, CustomPageWidgetLayout } from '@/types/customPages';

function generateId(): CustomPageId {
  const hex = Array.from(crypto.getRandomValues(new Uint8Array(4)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `custom-${hex}`;
}

function toSlug(name: string, existingSlugs: string[]): string {
  let slug = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  if (!slug) slug = 'page';

  let candidate = slug;
  let counter = 2;
  while (existingSlugs.includes(candidate)) {
    candidate = `${slug}-${counter}`;
    counter++;
  }
  return candidate;
}

interface CustomPagesState {
  pages: CustomPageState[];
  editingPageId: CustomPageId | null;

  createPage: (name: string, icon: string) => CustomPageId;
  updatePage: (id: CustomPageId, updates: Partial<Pick<CustomPageDefinition, 'name' | 'icon' | 'enabled'>>) => void;
  deletePage: (id: CustomPageId) => void;

  addWidget: (pageId: CustomPageId, widgetId: string) => void;
  removeWidget: (pageId: CustomPageId, widgetId: string) => void;
  reorderWidgets: (pageId: CustomPageId, fromIndex: number, toIndex: number) => void;
  setWidgetSize: (pageId: CustomPageId, widgetId: string, size: CustomPageWidgetLayout['size']) => void;
  resetPageLayout: (pageId: CustomPageId) => void;

  setEditingPageId: (id: CustomPageId | null) => void;

  getPage: (id: CustomPageId) => CustomPageState | undefined;
  getPageBySlug: (slug: string) => CustomPageState | undefined;
  getEnabledPages: () => CustomPageDefinition[];
}

export const useCustomPagesStore = create<CustomPagesState>()(
  persist(
    (set, get) => ({
      pages: [],
      editingPageId: null,

      createPage: (name, icon) => {
        const id = generateId();
        const existingSlugs = get().pages.map((p) => p.definition.slug);
        const slug = toSlug(name, existingSlugs);
        const order = get().pages.length;

        const newPage: CustomPageState = {
          definition: {
            id,
            name,
            icon,
            slug,
            createdAt: new Date().toISOString(),
            enabled: true,
            order,
          },
          widgets: [],
        };

        set((s) => ({ pages: [...s.pages, newPage] }));
        return id;
      },

      updatePage: (id, updates) =>
        set((s) => ({
          pages: s.pages.map((p) =>
            p.definition.id === id
              ? { ...p, definition: { ...p.definition, ...updates } }
              : p
          ),
        })),

      deletePage: (id) =>
        set((s) => ({
          pages: s.pages.filter((p) => p.definition.id !== id),
          editingPageId: s.editingPageId === id ? null : s.editingPageId,
        })),

      addWidget: (pageId, widgetId) =>
        set((s) => ({
          pages: s.pages.map((p) => {
            if (p.definition.id !== pageId) return p;
            if (p.widgets.some((w) => w.id === widgetId)) return p;
            return { ...p, widgets: [...p.widgets, { id: widgetId, size: 'full' }] };
          }),
        })),

      removeWidget: (pageId, widgetId) =>
        set((s) => ({
          pages: s.pages.map((p) =>
            p.definition.id === pageId
              ? { ...p, widgets: p.widgets.filter((w) => w.id !== widgetId) }
              : p
          ),
        })),

      reorderWidgets: (pageId, fromIndex, toIndex) =>
        set((s) => ({
          pages: s.pages.map((p) => {
            if (p.definition.id !== pageId) return p;
            const next = [...p.widgets];
            const [moved] = next.splice(fromIndex, 1);
            next.splice(toIndex, 0, moved);
            return { ...p, widgets: next };
          }),
        })),

      setWidgetSize: (pageId, widgetId, size) =>
        set((s) => ({
          pages: s.pages.map((p) =>
            p.definition.id === pageId
              ? {
                  ...p,
                  widgets: p.widgets.map((w) =>
                    w.id === widgetId ? { ...w, size } : w
                  ),
                }
              : p
          ),
        })),

      resetPageLayout: (pageId) =>
        set((s) => ({
          pages: s.pages.map((p) =>
            p.definition.id === pageId ? { ...p, widgets: [] } : p
          ),
        })),

      setEditingPageId: (id) => set({ editingPageId: id }),

      getPage: (id) => get().pages.find((p) => p.definition.id === id),

      getPageBySlug: (slug) => get().pages.find((p) => p.definition.slug === slug),

      getEnabledPages: () =>
        get()
          .pages.filter((p) => p.definition.enabled)
          .map((p) => p.definition)
          .sort((a, b) => a.order - b.order),
    }),
    {
      name: 'atlaxia-custom-pages',
    }
  )
);
