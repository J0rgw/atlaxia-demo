import { useMemo } from 'react';
import { EChart } from '@/components/ui/EChart';
import { DARK_TOOLTIP, ATLAXIA_COLORS } from '@/lib/echarts-theme';
import { useEChartsTheme } from '@/hooks/useEChartsTheme';
import { useProcessStatus } from '@/hooks/useOverviewData';
import { Card, CardContent } from '@/components/ui/Card';
import { useTranslation } from '@/stores/languageStore';

const STATUS_COLORS: Record<string, string> = {
  normal: ATLAXIA_COLORS.success,
  warning: ATLAXIA_COLORS.warning,
  critical: ATLAXIA_COLORS.error,
};

export function ProcessStatusChart() {
  const { t } = useTranslation();
  const { theme, axisDefaults, isDark } = useEChartsTheme();
  const { data, isLoading } = useProcessStatus();

  const option = useMemo(() => {
    if (!data?.process_areas?.length) return null;

    const areas = [...data.process_areas].reverse();
    const names = areas.map((a) => a.name);
    const sensorCounts = areas.map((a) => a.sensor_count);
    const alarmCounts = areas.map((a) => a.sensors_in_alarm);
    const statusColors = areas.map((a) => STATUS_COLORS[a.status] || ATLAXIA_COLORS.success);

    return {
      tooltip: {
        ...DARK_TOOLTIP,
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: Array<{ name: string; seriesName: string; value: number; dataIndex: number }>) => {
          if (!Array.isArray(params) || !params.length) return '';
          const idx = params[0].dataIndex;
          const area = areas[idx];
          const status = area.status;
          const statusLabel = status === 'normal' ? 'OK' : status === 'warning' ? t('warning') : t('critical');
          return `<div style="font-size:12px">
            <div style="font-weight:600;margin-bottom:4px">${area.name}</div>
            <div>${area.sensors_in_alarm} / ${area.sensor_count} ${t('sensorsInAlarm')}</div>
            <div style="color:${STATUS_COLORS[status]}">${statusLabel}</div>
          </div>`;
        },
      },
      grid: {
        left: 120,
        right: 24,
        top: 8,
        bottom: 24,
      },
      xAxis: {
        type: 'value',
        ...axisDefaults,
        axisLabel: { ...axisDefaults.axisLabel, fontSize: 10 },
        splitLine: { lineStyle: { color: isDark ? '#1E293B' : '#F1F5F9' } },
      },
      yAxis: {
        type: 'category',
        data: names,
        ...axisDefaults,
        axisLabel: {
          ...axisDefaults.axisLabel,
          fontSize: 11,
          width: 110,
          overflow: 'truncate',
        },
        axisTick: { show: false },
      },
      series: [
        {
          name: t('sensorsInAlarm'),
          type: 'bar',
          stack: 'total',
          data: alarmCounts.map((val, idx) => ({
            value: val,
            itemStyle: { color: statusColors[idx], borderRadius: val > 0 && val === sensorCounts[idx] ? [0, 4, 4, 0] : [0, 0, 0, 0] },
          })),
          barWidth: 16,
        },
        {
          name: 'OK',
          type: 'bar',
          stack: 'total',
          data: sensorCounts.map((total, idx) => ({
            value: total - alarmCounts[idx],
            itemStyle: {
              color: isDark ? '#334155' : '#E2E8F0',
              borderRadius: [0, 4, 4, 0],
            },
          })),
          barWidth: 16,
        },
      ],
    };
  }, [data, axisDefaults, isDark, t]);

  return (
    <Card padding="none">
      <div className="px-4 pt-3 pb-1 flex items-center gap-3 border-b border-[var(--border-subtle)]/40">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wide">
          {t('processStatus')}
        </h3>
        {data && (
          <span className="ml-auto text-[10px] text-[var(--text-muted)] font-readout">
            {data.total_alarms} {t('sensorsInAlarm')}
          </span>
        )}
      </div>
      <CardContent className="p-2">
        <div className="h-72">
          {isLoading ? (
            <div className="h-full rounded-lg bg-[var(--bg-inset)]/30 animate-pulse" />
          ) : option ? (
            <EChart
              option={option}
              theme={theme}
              style={{ height: '100%', width: '100%' }}
              opts={{ renderer: 'canvas' }}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-sm text-[var(--text-muted)]">
              {t('noRecentEvents')}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
