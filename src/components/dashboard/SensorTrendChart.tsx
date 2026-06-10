import { useMemo } from 'react';
import { EChart } from '@/components/ui/EChart';
import { DARK_TOOLTIP, SERIES_PALETTE } from '@/lib/echarts-theme';
import { useEChartsTheme } from '@/hooks/useEChartsTheme';
import { useTelemetryHistory } from '@/hooks/useOverviewData';
import { useSensorsConfig } from '@/hooks/useSensorsConfig';
import { Card, CardContent } from '@/components/ui/Card';
import { LiveIndicator } from './LiveIndicator';
import { useTranslation } from '@/stores/languageStore';

export function SensorTrendChart() {
  const { t } = useTranslation();
  const { theme, axisDefaults, isDark } = useEChartsTheme();
  const { sensorsConfig, getSensorMapping, getSensorRange } = useSensorsConfig();

  // Pick sensors from config's defaultSelected (config-driven, not hardcoded)
  const selectedTags = useMemo(
    () =>
      sensorsConfig.defaultSelected?.length > 0
        ? sensorsConfig.defaultSelected.slice(0, 4)
        : ['LIT101', 'FIT101', 'AIT201'],
    [sensorsConfig.defaultSelected],
  );

  // Build ThingsBoard keys for the history endpoint
  const sensorMeta = useMemo(() => {
    return selectedTags.map((tag) => {
      const mapping = getSensorMapping(tag);
      const range = getSensorRange(tag);
      return {
        tag,
        tbKey: mapping?.thingsboard_key || tag,
        unit: mapping?.unit || range?.unit || '',
        min: range?.min ?? 0,
        max: range?.max ?? 100,
        displayName: mapping?.display_name || tag,
      };
    });
  }, [selectedTags, getSensorMapping, getSensorRange]);

  const tbKeys = sensorMeta.map((s) => s.tbKey);

  // Fetch last 24h with 1-minute AVG buckets
  const now = Date.now();
  const startTs = now - 24 * 60 * 60 * 1000;

  const { data: historyData, isLoading } = useTelemetryHistory(tbKeys, startTs, now, {
    aggregation: 'AVG',
    interval: 60000,
  });

  // Build chart option
  const option = useMemo(() => {
    if (!historyData?.data) return null;

    // Need at least one sensor with data to render
    const hasAny = tbKeys.some((k) => historyData.data[k]?.length > 0);
    if (!hasAny) return null;

    const series = sensorMeta.map((sensor, idx) => {
      const points = historyData.data[sensor.tbKey] || [];
      const rangeSpan = sensor.max - sensor.min || 1;

      return {
        name: sensor.tag,
        type: 'line' as const,
        data: points.map((p) => {
          const raw = parseFloat(p.value);
          // Normalize to 0-100% of operating range
          const pct = Math.round(((raw - sensor.min) / rangeSpan) * 100 * 100) / 100;
          return [p.ts, pct] as [number, number];
        }),
        lineStyle: { color: SERIES_PALETTE[idx % SERIES_PALETTE.length], width: 2 },
        itemStyle: { color: SERIES_PALETTE[idx % SERIES_PALETTE.length] },
        showSymbol: false,
        smooth: 0.3,
        connectNulls: false,
      };
    });

    return {
      tooltip: {
        ...DARK_TOOLTIP,
        trigger: 'axis',
        formatter: (params: Array<{ seriesName: string; value: [number, number]; axisValue: number; color: string }>) => {
          if (!Array.isArray(params) || params.length === 0) return '';
          const ts = params[0].axisValue;
          const time = new Date(ts).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
          let html = `<div style="font-size:12px"><div style="color:#94A3B8;margin-bottom:4px">${time}</div>`;
          for (const p of params) {
            const sensor = sensorMeta.find((s) => s.tag === p.seriesName);
            if (!sensor) continue;
            const pct = Array.isArray(p.value) ? p.value[1] : Number(p.value);
            // Reverse normalize to get raw value
            const rangeSpan = sensor.max - sensor.min || 1;
            const rawValue = (pct / 100) * rangeSpan + sensor.min;
            html += `<div style="display:flex;align-items:center;gap:6px">
              <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color}"></span>
              <span>${p.seriesName}:</span>
              <span style="font-weight:600">${rawValue.toFixed(2)} ${sensor.unit}</span>
              <span style="color:#64748B">(${pct.toFixed(0)}%)</span>
            </div>`;
          }
          html += '</div>';
          return html;
        },
      },
      legend: {
        icon: 'circle',
        itemWidth: 8,
        itemHeight: 8,
        right: 16,
        top: 0,
        textStyle: { color: isDark ? '#94A3B8' : '#64748B', fontSize: 11 },
      },
      grid: {
        left: 40,
        right: 16,
        top: 32,
        bottom: 24,
      },
      xAxis: {
        type: 'time',
        ...axisDefaults,
        axisLabel: {
          ...axisDefaults.axisLabel,
          fontSize: 10,
        },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        ...axisDefaults,
        axisLabel: {
          ...axisDefaults.axisLabel,
          fontSize: 10,
          formatter: '{value}%',
        },
        min: 0,
        max: 100,
      },
      dataZoom: [{ type: 'inside' }],
      series,
    };
  }, [historyData, sensorMeta, tbKeys, axisDefaults, isDark]);

  return (
    <Card padding="none">
      <div className="px-4 pt-3 pb-1 flex items-center gap-3 border-b border-[var(--border-subtle)]/40">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wide">
          {t('sensorTrends')}
        </h3>
        <LiveIndicator />
        <span className="ml-auto text-[10px] text-[var(--text-muted)] font-readout">24h</span>
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
            <div className="h-full flex flex-col items-center justify-center gap-2 text-[var(--text-muted)]">
              <svg className="w-10 h-10 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
              </svg>
              <span className="text-sm">{t('noTelemetryData')}</span>
              <span className="text-xs opacity-60">{selectedTags.join(', ')}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
