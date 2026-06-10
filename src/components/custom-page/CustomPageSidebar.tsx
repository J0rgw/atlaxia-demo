import {
  Pencil, X, RotateCcw, Plus, Check,
  Activity, Radar, TrendingUp, Calendar, List, BarChart,
  Network, Layers, PieChart,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/stores/languageStore';
import { useCustomPagesStore } from '@/stores/customPagesStore';
import {
  EXTENDED_WIDGET_REGISTRY,
  WIDGET_CATEGORY_LABELS,
  type WidgetCategory,
} from '@/config/widgetRegistry';
import type { CustomPageId } from '@/types/customPages';

const WIDGET_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  'activity': Activity,
  'radar': Radar,
  'trending-up': TrendingUp,
  'calendar': Calendar,
  'list': List,
  'bar-chart': BarChart,
  'network': Network,
  'layers': Layers,
  'pie-chart': PieChart,
};

interface CustomPageSidebarProps {
  pageId: CustomPageId;
}

export function CustomPageSidebar({ pageId }: CustomPageSidebarProps) {
  const { t, language } = useTranslation();
  const editingPageId = useCustomPagesStore((s) => s.editingPageId);
  const setEditingPageId = useCustomPagesStore((s) => s.setEditingPageId);
  const page = useCustomPagesStore((s) => s.getPage(pageId));
  const addWidget = useCustomPagesStore((s) => s.addWidget);
  const removeWidget = useCustomPagesStore((s) => s.removeWidget);
  const resetPageLayout = useCustomPagesStore((s) => s.resetPageLayout);

  const editMode = editingPageId === pageId;
  const activeIds = new Set(page?.widgets.map((w) => w.id) || []);

  const toggleEditMode = () => {
    setEditingPageId(editMode ? null : pageId);
  };

  const categories = [...new Set(EXTENDED_WIDGET_REGISTRY.map((w) => w.category))] as WidgetCategory[];

  return (
    <div className="space-y-3 sticky top-20">
      <Card padding="none">
        <div className="px-4 py-3 flex items-center justify-between">
          <span className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wide">
            {t('editLayout')}
          </span>
          <button
            onClick={toggleEditMode}
            className={cn(
              'p-2 rounded-lg border transition-all',
              editMode
                ? 'bg-primary-50 dark:bg-primary-900/30 border-primary-500 text-primary-600 dark:text-primary-400 shadow-sm'
                : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-inset)] dark:hover:bg-[var(--bg-inset)]'
            )}
          >
            {editMode ? <X className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
          </button>
        </div>
      </Card>

      {editMode && (
        <Card padding="none">
          <div className="px-4 pt-3 pb-1 border-b border-[var(--border-subtle)]/40">
            <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
              {t('widgetCatalog')}
            </h3>
          </div>
          <CardContent className="p-3 space-y-3">
            {categories.map((cat) => {
              const widgets = EXTENDED_WIDGET_REGISTRY.filter((w) => w.category === cat);
              const label = WIDGET_CATEGORY_LABELS[cat];
              return (
                <div key={cat}>
                  <h4 className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5 px-1">
                    {language === 'es' ? label.es : label.en}
                  </h4>
                  <div className="space-y-1">
                    {widgets.map((def) => {
                      const isActive = activeIds.has(def.id);
                      const IconComp = WIDGET_ICONS[def.icon];
                      return (
                        <button
                          key={def.id}
                          onClick={() => (isActive ? removeWidget(pageId, def.id) : addWidget(pageId, def.id))}
                          className={cn(
                            'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-sm transition-all',
                            isActive
                              ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800'
                              : 'bg-[var(--bg-inset)] dark:bg-[var(--bg-inset)]/50 text-[var(--text-secondary)] border border-transparent hover:bg-[var(--bg-inset)]'
                          )}
                        >
                          {IconComp && <IconComp className="w-4 h-4 shrink-0" />}
                          <span className="flex-1 truncate">{t(def.titleKey)}</span>
                          {isActive ? (
                            <Check className="w-3.5 h-3.5 text-primary-500" />
                          ) : (
                            <Plus className="w-3.5 h-3.5 opacity-40" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            <button
              onClick={() => resetPageLayout(pageId)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 mt-2 rounded-lg text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-inset)] transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {t('resetLayout')}
            </button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
