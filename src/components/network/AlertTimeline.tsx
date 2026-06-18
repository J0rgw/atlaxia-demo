import { useState } from 'react';
import { EChart } from '@/components/ui/EChart';
import { DARK_TOOLTIP } from '@/lib/echarts-theme';
import { useEChartsTheme } from '@/hooks/useEChartsTheme';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { useAlertTimeline } from '@/hooks/useNetwork';
import { useTranslation } from '@/stores/languageStore';

const ALERT_LEVELS = [
  { key: 'Emergencia', color: '#f85149' },
  { key: 'Alerta', color: '#d29922' },
  { key: 'Aviso', color: '#3fb950' },
] as const;

export function AlertTimeline() {
  const { t } = useTranslation();
  const { theme } = useEChartsTheme();
  const [bucket, setBucket] = useState<'hour' | 'day'>('hour');
  const [days, setDays] = useState(7);

  const { data, isLoading } = useAlertTimeline(days, bucket);
  const buckets = data?.buckets ?? [];

  const formatted = buckets.map((b) => ({
    ...b,
    label:
      bucket === 'hour'
        ? new Date(b.timestamp).toLocaleString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })
        : new Date(b.timestamp).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
          }),
  }));

  const option = {
    tooltip: {
      ...DARK_TOOLTIP,
      trigger: 'axis',
    },
    grid: {
      left: 32,
      right: 8,
      top: 8,
      bottom: 24,
    },
    xAxis: {
      type: 'category',
      data: formatted.map((b) => b.label),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#8b949e', fontSize: 10 },
      splitLine: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#8b949e', fontSize: 10 },
      splitLine: {
        lineStyle: { color: '#21262d', type: 'dashed' },
      },
      minInterval: 1,
    },
    series: ALERT_LEVELS.map(({ key, color }) => ({
      name: key,
      type: 'line' as const,
      stack: 'alerts',
      smooth: true,
      showSymbol: false,
      lineStyle: { width: 1.5, color },
      itemStyle: { color },
      areaStyle: {
        color: `${color}26`,
      },
      data: formatted.map((b) => (b as Record<string, unknown>)[key] ?? 0),
    })),
  };

  return (
    <Card padding="none">
      <CardHeader className="px-4 pt-4 pb-2">
        <CardTitle>{t('alertTimeline')}</CardTitle>
        <div className="flex items-center gap-2">
          <div
            role="group"
            aria-label={t('dateRange')}
            className="inline-flex items-center gap-0.5 rounded-lg bg-[var(--bg-inset)] p-1"
          >
            {([
              { label: '24h', d: 1 },
              { label: '7d', d: 7 },
              { label: '30d', d: 30 },
            ] as const).map((opt) => (
              <button
                key={opt.d}
                onClick={() => setDays(opt.d)}
                aria-pressed={days === opt.d}
                className={`px-3 h-7 rounded-md text-xs font-medium whitespace-nowrap transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/40 ${
                  days === opt.d
                    ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] font-semibold shadow-sm'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="inline-flex items-center gap-0.5 rounded-lg bg-[var(--bg-inset)] p-1">
            {(['hour', 'day'] as const).map((b) => (
              <button
                key={b}
                onClick={() => setBucket(b)}
                aria-pressed={bucket === b}
                className={`px-3 h-7 rounded-md text-xs font-medium whitespace-nowrap transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/40 ${
                  bucket === b
                    ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] font-semibold shadow-sm'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {b === 'hour' ? t('hourly') : t('daily')}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-2 pb-3">
        {isLoading ? (
          <div className="h-44 flex items-center justify-center">
            <svg className="animate-spin h-5 w-5 text-[var(--status-normal)]" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        ) : formatted.length === 0 ? (
          <div className="h-44 flex items-center justify-center text-sm text-[var(--text-muted)]">
            {t('noAlertsFound')}
          </div>
        ) : (
          <EChart
            option={option}
            theme={theme}
            style={{ height: 176, width: '100%' }}
            opts={{ renderer: 'canvas' }}
          />
        )}
      </CardContent>
    </Card>
  );
}
