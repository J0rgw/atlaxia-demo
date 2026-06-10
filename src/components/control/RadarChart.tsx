import { EChart } from '@/components/ui/EChart';
import { DARK_TOOLTIP, ATLAXIA_COLORS } from '@/lib/echarts-theme';
import { useEChartsTheme } from '@/hooks/useEChartsTheme';
import { Card, CardContent } from '@/components/ui/Card';
import { useTranslation } from '@/stores/languageStore';
import type { ControlIndicators } from '@/types';

interface RadarChartProps {
  data: ControlIndicators;
  compact?: boolean;
}

export function RadarChart({ data, compact = false }: RadarChartProps) {
  const { t } = useTranslation();
  const { theme } = useEChartsTheme();

  const chartData = [
    { name: t('quality'), value: data.calidad },
    { name: t('flow'), value: data.caudal },
    { name: t('cybersecurity'), value: data.ciberseguridad },
    { name: t('humanFactor'), value: data.factorHumano },
    { name: t('temperature'), value: data.temperatura },
  ];

  const option = {
    tooltip: {
      ...DARK_TOOLTIP,
      trigger: 'item',
      formatter: (params: { value: number[] }) => {
        if (!params.value) return '';
        let html = '<div style="font-size:12px">';
        chartData.forEach((d) => {
          const riskPct = ((1 - d.value) * 100).toFixed(0);
          html += `<div style="display:flex;justify-content:space-between;gap:12px">
            <span>${d.name}</span>
            <span style="font-weight:600">${riskPct}% riesgo</span>
          </div>`;
        });
        html += '</div>';
        return html;
      },
    },
    radar: {
      indicator: chartData.map((d) => ({ name: d.name, max: 1 })),
      splitArea: { areaStyle: { color: ['transparent'] } },
      splitLine: { lineStyle: { color: '#21262d' } },
      axisLine: { lineStyle: { color: '#21262d' } },
      axisName: { color: '#8b949e', fontSize: 12 },
    },
    series: [
      {
        name: t('indicators'),
        type: 'radar',
        data: [{ value: chartData.map((d) => d.value), name: t('indicators') }],
        lineStyle: { color: ATLAXIA_COLORS.primary, width: 2 },
        areaStyle: { color: ATLAXIA_COLORS.primary, opacity: 0.3 },
        itemStyle: { color: ATLAXIA_COLORS.primary },
      },
    ],
  };

  if (compact) {
    return (
      <div className="w-full h-full">
        <EChart
          option={option}
          theme={theme}
          style={{ height: '100%', width: '100%' }}
          opts={{ renderer: 'canvas' }}
        />
      </div>
    );
  }

  return (
    <Card className="h-full">
      <CardContent className="h-full flex items-center justify-center">
        <div className="w-full h-80">
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
