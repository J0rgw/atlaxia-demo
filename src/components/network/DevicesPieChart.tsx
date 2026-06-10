import { EChart } from '@/components/ui/EChart';
import { DARK_TOOLTIP } from '@/lib/echarts-theme';
import { useEChartsTheme } from '@/hooks/useEChartsTheme';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { useTranslation } from '@/stores/languageStore';

interface DeviceTypeCount {
  deviceType: string;
  count: number;
}

interface DevicesPieChartProps {
  deviceCounts: DeviceTypeCount[];
  total: number;
}

const DEVICE_COLORS: Record<string, string> = {
  PLC: '#e879f9',
  Router: '#facc15',
  SCADA: '#ef4444',
  Switch: '#22d3ee',
  PC: '#3b82f6',
};

export function DevicesPieChart({ deviceCounts, total }: DevicesPieChartProps) {
  const { t } = useTranslation();
  const { theme } = useEChartsTheme();

  const data = deviceCounts.map((d) => ({
    name: d.deviceType,
    value: d.count,
    itemStyle: { color: DEVICE_COLORS[d.deviceType] || '#94a3b8' },
  }));

  const option = {
    tooltip: {
      ...DARK_TOOLTIP,
      trigger: 'item',
      formatter: '{b}: {c}',
    },
    series: [
      {
        type: 'pie',
        radius: ['50%', '85%'],
        center: ['50%', '50%'],
        data,
        padAngle: 2,
        itemStyle: { borderWidth: 0 },
        label: { show: false },
        emphasis: {
          scale: true,
          scaleSize: 4,
        },
      },
    ],
  };

  return (
    <Card>
      <CardHeader className="pb-1">
        <CardTitle>{t('deviceDistribution')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <div className="w-28 h-28 flex-shrink-0">
            {total === 0 ? (
              <div className="w-full h-full rounded-full border-4 border-dashed border-[var(--border-subtle)] flex items-center justify-center">
                <span className="text-xs text-[var(--text-muted)]">0</span>
              </div>
            ) : (
              <EChart
                option={option}
                theme={theme}
                style={{ height: '100%', width: '100%' }}
                opts={{ renderer: 'canvas' }}
              />
            )}
          </div>
          <div className="flex flex-col gap-1.5 min-w-0">
            {deviceCounts.map((d) => (
              <div key={d.deviceType} className="flex items-center gap-2 text-xs">
                <span
                  className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                  style={{ backgroundColor: DEVICE_COLORS[d.deviceType] || '#94a3b8' }}
                />
                <span className="text-[var(--text-secondary)] truncate">{d.deviceType}</span>
                <span className="font-semibold text-[var(--text-primary)] ml-auto">
                  {d.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
