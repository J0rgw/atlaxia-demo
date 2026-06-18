import { EChart } from '@/components/ui/EChart';
import { DARK_TOOLTIP, ATLAXIA_COLORS } from '@/lib/echarts-theme';
import { useEChartsTheme } from '@/hooks/useEChartsTheme';
import { Card, CardContent } from '@/components/ui/Card';
import { useTranslation } from '@/stores/languageStore';
import type { ProductionData } from '@/types';

interface ComboChartProps {
  data: ProductionData[];
}

export function ComboChart({ data }: ComboChartProps) {
  const { t } = useTranslation();
  const { theme, axisDefaults } = useEChartsTheme();

  const option = {
    tooltip: {
      ...DARK_TOOLTIP,
      trigger: 'axis',
    },
    legend: {
      icon: 'roundRect',
      itemWidth: 10,
      itemHeight: 10,
      right: 16,
      top: 0,
      textStyle: { color: '#8b949e', fontSize: 11 },
    },
    toolbox: {
      right: 0,
      top: 24,
      feature: {
        dataZoom: {
          yAxisIndex: 'none',
          title: { zoom: 'Zoom', back: 'Reset' },
        },
        saveAsImage: {
          title: 'Export',
          pixelRatio: 2,
        },
      },
      iconStyle: {
        borderColor: '#8b949e',
      },
      emphasis: {
        iconStyle: {
          borderColor: ATLAXIA_COLORS.primary,
        },
      },
    },
    grid: {
      left: 48,
      right: 48,
      top: 40,
      bottom: 32,
    },
    xAxis: {
      type: 'time',
      ...axisDefaults,
      axisLabel: { ...axisDefaults.axisLabel, fontSize: 11 },
      splitLine: { show: false },
    },
    yAxis: [
      {
        type: 'value',
        ...axisDefaults,
        splitLine: { ...axisDefaults.splitLine, show: true },
      },
      {
        type: 'value',
        ...axisDefaults,
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: t('outputVolume'),
        type: 'bar',
        yAxisIndex: 0,
        data: data.map((d) => [d.timestamp, d.outputVolume] as [number, number]),
        itemStyle: {
          color: ATLAXIA_COLORS.primary,
          borderRadius: [3, 3, 0, 0],
        },
        barMaxWidth: 28,
        emphasis: {
          itemStyle: { color: ATLAXIA_COLORS.primaryHover },
        },
      },
      {
        name: t('energyConsumption'),
        type: 'line',
        yAxisIndex: 1,
        data: data.map((d) => [d.timestamp, d.energyConsumption] as [number, number]),
        lineStyle: { color: ATLAXIA_COLORS.secondary, width: 2 },
        itemStyle: { color: ATLAXIA_COLORS.secondary },
        showSymbol: true,
        symbolSize: 6,
        smooth: 0.3,
        connectNulls: false,
        areaStyle: {
          color: `${ATLAXIA_COLORS.secondary}26`,
        },
      },
    ],
  };

  return (
    <Card padding="none">
      <div className="px-4 pt-3 pb-1 flex items-center gap-3 border-b border-[var(--border-subtle)]">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wide">
          {t('realtimeAnalysis')}
        </h3>
      </div>
      <CardContent className="p-2">
        <div className="h-72">
          <EChart
            option={option}
            theme={theme}
            style={{ height: '100%', width: '100%' }}
            opts={{ renderer: 'canvas' }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
