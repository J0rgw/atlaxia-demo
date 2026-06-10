import {
  Pencil, X, RotateCcw, Plus, Check,
  Activity, Radar, TrendingUp, Calendar, List, BarChart,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/stores/languageStore';
import { useDashboardStore, WIDGET_REGISTRY } from '@/stores/dashboardStore';
import type { DateRangePreset, AlertTypeFilter } from '@/stores/dashboardStore';

const WIDGET_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  'activity': Activity,
  'radar': Radar,
  'trending-up': TrendingUp,
  'calendar': Calendar,
  'list': List,
  'bar-chart': BarChart,
};

export function FiltersPanel() {
  const { t } = useTranslation();

  const {
    widgets, editMode, toggleEditMode, addWidget, removeWidget, resetLayout,
    filters, setFilters,
  } = useDashboardStore();

  const activeIds = new Set(widgets.map((w) => w.id));

  const dateRangeOptions: { value: DateRangePreset; labelKey: 'last24h' | 'last7days' | 'last30days' | 'custom' }[] = [
    { value: '24h', labelKey: 'last24h' },
    { value: '7d', labelKey: 'last7days' },
    { value: '30d', labelKey: 'last30days' },
    { value: 'custom', labelKey: 'custom' },
  ];

  const alertTypeOptions: { value: AlertTypeFilter; labelKey: 'allTypes' | 'emergency' | 'alert' | 'notice' }[] = [
    { value: 'all', labelKey: 'allTypes' },
    { value: 'Emergencia', labelKey: 'emergency' },
    { value: 'Alerta', labelKey: 'alert' },
    { value: 'Aviso', labelKey: 'notice' },
  ];

  return (
    <div className="space-y-3 sticky top-20">
      {/* Edit mode toggle */}
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

      {/* Widget catalog (visible in edit mode) */}
      {editMode && (
        <Card padding="none">
          <div className="px-4 pt-3 pb-1 border-b border-[var(--border-subtle)]/40">
            <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
              {t('widgetCatalog')}
            </h3>
          </div>
          <CardContent className="p-3 space-y-1.5">
            {WIDGET_REGISTRY.map((def) => {
              const isActive = activeIds.has(def.id);
              const IconComp = WIDGET_ICONS[def.icon];
              return (
                <button
                  key={def.id}
                  onClick={() => (isActive ? removeWidget(def.id) : addWidget(def.id))}
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
            <button
              onClick={resetLayout}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 mt-2 rounded-lg text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-inset)] transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {t('resetLayout')}
            </button>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card className="h-fit">
        <CardHeader>
          <CardTitle>{t('dataParameters')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Date Range */}
          <div>
            <label className="text-sm font-medium text-[var(--text-primary)] mb-2 block">
              {t('dateRange')}
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {dateRangeOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setFilters({ dateRange: option.value })}
                  className={cn(
                    'px-2 py-1.5 text-xs font-medium rounded-lg border transition-colors',
                    filters.dateRange === option.value
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'bg-[var(--bg-surface)] text-[var(--text-primary)] border-[var(--border-subtle)] hover:bg-[var(--bg-inset)] dark:hover:bg-[var(--bg-inset)]'
                  )}
                >
                  {t(option.labelKey)}
                </button>
              ))}
            </div>
            {filters.dateRange === 'custom' && (
              <div className="mt-2 space-y-2">
                <div>
                  <label className="text-xs text-[var(--text-secondary)] mb-1 block">
                    {t('dateFrom')}
                  </label>
                  <Input
                    type="datetime-local"
                    value={filters.customDateFrom?.slice(0, 16) || ''}
                    onChange={(e) =>
                      setFilters({ customDateFrom: e.target.value ? new Date(e.target.value).toISOString() : null })
                    }
                  />
                </div>
                <div>
                  <label className="text-xs text-[var(--text-secondary)] mb-1 block">
                    {t('dateTo')}
                  </label>
                  <Input
                    type="datetime-local"
                    value={filters.customDateTo?.slice(0, 16) || ''}
                    onChange={(e) =>
                      setFilters({ customDateTo: e.target.value ? new Date(e.target.value).toISOString() : null })
                    }
                  />
                </div>
              </div>
            )}
          </div>

          {/* Alert Type */}
          <div>
            <label className="text-sm font-medium text-[var(--text-primary)] mb-2 block">
              {t('filterByType')}
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {alertTypeOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setFilters({ alertType: option.value })}
                  className={cn(
                    'px-2 py-1.5 text-xs font-medium rounded-lg border transition-colors',
                    filters.alertType === option.value
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'bg-[var(--bg-surface)] text-[var(--text-primary)] border-[var(--border-subtle)] hover:bg-[var(--bg-inset)] dark:hover:bg-[var(--bg-inset)]'
                  )}
                >
                  {t(option.labelKey)}
                </button>
              ))}
            </div>
          </div>

          {/* Anomaly Threshold */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-[var(--text-primary)]">
                {t('anomalyThreshold')}
              </label>
              <span className="text-xs font-readout text-[var(--text-secondary)] bg-[var(--bg-inset)] px-1.5 py-0.5 rounded">
                {filters.anomalyThreshold.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={filters.anomalyThreshold}
              onChange={(e) => setFilters({ anomalyThreshold: parseFloat(e.target.value) })}
              className="w-full h-1.5 bg-[var(--bg-inset)] dark:bg-[var(--bg-inset)] rounded-lg appearance-none cursor-pointer accent-primary-600"
            />
            <div className="flex justify-between text-[10px] text-[var(--text-muted)] mt-1">
              <span>0.00</span>
              <span>1.00</span>
            </div>
          </div>

          {/* Auto-refresh */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[var(--text-primary)]">
              {t('autoRefresh')}
            </span>
            <Switch
              checked={filters.autoRefresh}
              onCheckedChange={(checked) => setFilters({ autoRefresh: checked })}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
