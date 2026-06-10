import { useMemo } from 'react';
import { EChart } from '@/components/ui/EChart';
import { DARK_TOOLTIP, ATLAXIA_COLORS, SERIES_PALETTE } from '@/lib/echarts-theme';
import { useEChartsTheme } from '@/hooks/useEChartsTheme';
import { Card, CardContent } from '@/components/ui/Card';
import { LiveIndicator } from './LiveIndicator';
import { useTranslation } from '@/stores/languageStore';

interface AnomalyItem {
  sensorKey: string;
  sensorName: string;
  category: string;
  currentValue: number;
  behaviorSeparation: number;
  anomalyIndicator: number;
  isAnomaly: boolean;
}

interface AnomalyScatterChartProps {
  anomalies: AnomalyItem[];
  threshold: number;
  anomalyCount?: number;
}

const CATEGORY_COLORS: Record<string, string> = {
  Caudal: SERIES_PALETTE[0],
  Temperatura: SERIES_PALETTE[1],
  Quimica: SERIES_PALETTE[2],
  Presion: SERIES_PALETTE[3],
  Nivel: SERIES_PALETTE[4],
};

export function AnomalyScatterChart({ anomalies, threshold, anomalyCount }: AnomalyScatterChartProps) {
  const { t } = useTranslation();
  const { theme, axisDefaults, isDark } = useEChartsTheme();

  const option = useMemo(() => {
    if (!anomalies?.length) return null;

    const categories = [...new Set(anomalies.map((a) => a.category))];

    const series = categories.map((cat) => {
      const items = anomalies.filter((a) => a.category === cat);
      return {
        name: cat,
        type: 'scatter' as const,
        data: items.map((a) => ({
          value: [a.behaviorSeparation, a.anomalyIndicator],
          itemStyle: {
            color: CATEGORY_COLORS[cat] || SERIES_PALETTE[5],
            opacity: a.isAnomaly ? 1 : 0.6,
          },
          symbolSize: a.isAnomaly ? 14 : 8,
          _sensor: a,
        })),
      };
    });

    return {
      tooltip: {
        ...DARK_TOOLTIP,
        trigger: 'item',
        formatter: (params: { data: { _sensor: AnomalyItem } }) => {
          const s = params.data._sensor;
          if (!s) return '';
          const pct = Math.round(s.anomalyIndicator * 100);
          return `<div style="font-size:12px">
            <div style="font-weight:600;margin-bottom:4px">${s.sensorName}</div>
            <div>${s.category}</div>
            <div>${t('currentValue')}: ${s.currentValue.toFixed(2)}</div>
            <div>${t('anomalyIndicator')}: ${pct}%</div>
          </div>`;
        },
      },
      legend: {
        show: true,
        bottom: 0,
        left: 'center',
        orient: 'horizontal',
        itemGap: 16,
        textStyle: { color: isDark ? '#94A3B8' : '#64748B', fontSize: 10 },
        itemWidth: 10,
        itemHeight: 10,
      },
      grid: {
        left: 48,
        right: 24,
        top: 12,
        bottom: 48,
      },
      xAxis: {
        type: 'value',
        name: t('behaviorSeparation'),
        nameLocation: 'center',
        nameGap: 24,
        nameTextStyle: { color: isDark ? '#94A3B8' : '#64748B', fontSize: 10 },
        ...axisDefaults,
        axisLabel: { ...axisDefaults.axisLabel, fontSize: 10 },
        splitLine: { lineStyle: { color: isDark ? '#1E293B' : '#F1F5F9' } },
      },
      yAxis: {
        type: 'value',
        name: t('anomalyIndicator'),
        nameLocation: 'center',
        nameGap: 32,
        nameTextStyle: { color: isDark ? '#94A3B8' : '#64748B', fontSize: 10 },
        min: 0,
        max: 1,
        ...axisDefaults,
        axisLabel: { ...axisDefaults.axisLabel, fontSize: 10 },
        splitLine: { lineStyle: { color: isDark ? '#1E293B' : '#F1F5F9' } },
      },
      series: [
        ...series,
        {
          type: 'line',
          markLine: {
            silent: true,
            symbol: 'none',
            lineStyle: {
              color: ATLAXIA_COLORS.error,
              type: 'dashed',
              width: 1.5,
            },
            data: [{ yAxis: threshold }],
            label: {
              position: 'insideEndTop',
              formatter: `${threshold}`,
              fontSize: 9,
              color: ATLAXIA_COLORS.error,
            },
          },
          data: [],
        },
      ],
    };
  }, [anomalies, threshold, axisDefaults, isDark, t]);

  return (
    <Card padding="none">
      <div className="px-4 pt-3 pb-1 flex items-center gap-3 border-b border-[var(--border-subtle)]/40">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wide">
          {t('anomalyDetection')}
        </h3>
        <LiveIndicator />
        {anomalyCount !== undefined && anomalyCount > 0 && (
          <span className="ml-auto text-[10px] font-readout px-1.5 py-0.5 rounded bg-[var(--status-critical-muted)] text-[var(--status-critical)]">
            {anomalyCount} {t('anomalyCount')}
          </span>
        )}
      </div>
      <CardContent className="p-2">
        <div className="h-72">
          {anomalies?.length ? (
            <EChart
              option={option!}
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
