import { useState, useMemo, useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { EChart } from '@/components/ui/EChart';
import { DARK_TOOLTIP, ATLAXIA_COLORS } from '@/lib/echarts-theme';
import { useEChartsTheme } from '@/hooks/useEChartsTheme';
import {
  useTelemetryRange,
  prefetchTelemetryRange,
  type TelemetryRange,
} from '@/hooks/useTelemetryRange';
import { useSensorInferences } from '@/hooks/useSensorInferences';
import { useInferenceHistory } from '@/hooks/useInference';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { cn, formatDateTime } from '@/lib/utils';
import { useTranslation } from '@/stores/languageStore';
import type { MachineTelemetryValue, MachineAIMetadata } from '@/types';

/**
 * Severity color matrix for inference markers. Mirrors the ISA-101 status
 * tokens used elsewhere: red for CRITICAL/HIGH, amber for MEDIUM, yellow
 * for LOW. Anything below LOW (INFO/NORMAL) never gets a marker — the
 * hook filters those out before they reach us.
 */
function severityColor(level: number): string {
  if (level >= 4) return '#f85149'; // HIGH / CRITICAL
  if (level >= 3) return '#d29922'; // MEDIUM
  return '#e3a72d';                 // LOW
}

interface AreaBandChartProps {
  sensorName: string;
  /** Raw ThingsBoard attribute key — drives useTelemetryRange. */
  tbKey: string;
  /** Display tag (ISA name) for per-sensor inference marker resolution. */
  displayTag?: string;
  unit?: string;
  normalRange?: { min: number; max: number };
  warningRange?: { min: number; max: number };
  aiMetadata?: MachineAIMetadata;
  /** Optional override; when omitted the chart shows a LIVE pill iff the
   *  current range is in REALTIME mode. */
  isLive?: boolean;
  initialRange?: TelemetryRange;
}

const TIME_RANGES: { value: TelemetryRange; label: string }[] = [
  { value: '1m', label: '1m' },
  { value: '5m', label: '5m' },
  { value: '15m', label: '15m' },
  { value: '1h', label: '1h' },
  { value: '5h', label: '5h' },
  { value: '24h', label: '24h' },
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
];

function TimeRangeSelector({
  value,
  onChange,
  onPrefetch,
}: {
  value: TelemetryRange;
  onChange: (range: TelemetryRange) => void;
  onPrefetch?: (range: TelemetryRange) => void;
}) {
  return (
    <div className="flex items-center gap-1 bg-[var(--bg-inset)] rounded-lg p-0.5">
      {TIME_RANGES.map((range) => (
        <button
          key={range.value}
          onClick={() => onChange(range.value)}
          onMouseEnter={onPrefetch ? () => onPrefetch(range.value) : undefined}
          onFocus={onPrefetch ? () => onPrefetch(range.value) : undefined}
          className={cn(
            'px-2 py-1 text-xs font-medium rounded-md transition-colors',
            value === range.value
              ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          )}
        >
          {range.label}
        </button>
      ))}
    </div>
  );
}

function LiveIndicator() {
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[var(--status-normal-muted)] rounded text-[10px] font-semibold text-[var(--status-normal)]">
      <span className="relative flex h-1.5 w-1.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--status-normal)] opacity-75" />
        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[var(--status-normal)]" />
      </span>
      LIVE
    </span>
  );
}

function ExportButton({
  data,
  sensorName,
  unit,
}: {
  data: MachineTelemetryValue[];
  sensorName: string;
  unit: string;
}) {
  const handleExport = useCallback(() => {
    const headers = ['Timestamp', 'DateTime', `Value (${unit})`];
    const rows = data.map((point) => [
      point.ts,
      new Date(point.ts).toISOString(),
      (point.value ?? 0).toFixed(4),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${sensorName}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [data, sensorName, unit]);

  return (
    <button
      onClick={handleExport}
      className="flex items-center gap-1 px-2 py-1 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-inset)] rounded transition-colors"
      title="Export CSV"
    >
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
      <span>CSV</span>
    </button>
  );
}

function CurrentValue({
  value,
  unit,
  normalRange,
}: {
  value: number;
  unit: string;
  normalRange?: { min: number; max: number };
}) {
  const isNormal = !normalRange || (value >= normalRange.min && value <= normalRange.max);

  return (
    <div className="flex items-baseline gap-1">
      <span
        className={cn(
          'font-readout font-bold text-lg',
          isNormal ? 'text-[var(--text-primary)]' : 'text-[var(--status-critical)]'
        )}
      >
        {(value ?? 0).toFixed(2)}
      </span>
      <span className="text-xs text-[var(--text-secondary)]">{unit}</span>
    </div>
  );
}

export function AreaBandChart({
  sensorName,
  tbKey,
  displayTag,
  unit,
  normalRange,
  warningRange,
  aiMetadata,
  isLive,
  initialRange = '5m',
}: AreaBandChartProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [timeRange, setTimeRange] = useState<TelemetryRange>(initialRange);
  const [showBrush, setShowBrush] = useState(false);
  const { theme, axisDefaults } = useEChartsTheme();

  // Hover-driven cache warmup for HISTORIC ranges. REALTIME ranges short-
  // circuit inside prefetchTelemetryRange so they cost nothing.
  const handlePrefetch = useCallback(
    (range: TelemetryRange) => {
      void prefetchTelemetryRange(queryClient, tbKey, range);
    },
    [queryClient, tbKey],
  );

  const {
    data: filteredData,
    mode,
    isLoading,
    isStale,
    startTs,
    endTs,
    gapThresholdMs,
  } = useTelemetryRange({ tbKey, range: timeRange });

  // Wall-clock tick: in REALTIME mode advance the right edge of the axis even
  // when no data flows, so a long silence visibly grows the empty span rather
  // than freezing the chart at the last point. Honours prefers-reduced-motion
  // by dropping to a 5 s cadence.
  const [, setTick] = useState(0);
  useEffect(() => {
    if (mode !== 'realtime') return;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const period = reduced ? 5_000 : 1_000;
    const id = setInterval(() => setTick((n) => n + 1), period);
    return () => clearInterval(id);
  }, [mode]);

  // Build ECharts series data with null sentinels between distant points so
  // `connectNulls: false` actually breaks the line on real gaps instead of
  // drawing a long connector across them. Non-finite values are skipped
  // belt-and-braces — they should already be filtered upstream but a stray
  // NaN here would pin yDomain to [NaN, NaN] and silently break the chart.
  const seriesData = useMemo<Array<[number, number | null]>>(() => {
    const out: Array<[number, number | null]> = [];
    let prevTs: number | null = null;
    for (const p of filteredData) {
      if (!Number.isFinite(p.value)) continue;
      if (prevTs !== null && p.ts - prevTs > gapThresholdMs) {
        out.push([Math.floor((prevTs + p.ts) / 2), null]);
      }
      out.push([p.ts, p.value]);
      prevTs = p.ts;
    }
    return out;
  }, [filteredData, gapThresholdMs]);

  // Data extent for marker positioning ONLY — yAxis padding is computed by
  // ECharts via the min/max callbacks below, not from this value. Survey
  // ranges (normalRange/warningRange) intentionally do NOT contribute: they
  // render as markLine (paso 3e), not as axis-framing.
  const dataExtent = useMemo<[number, number] | null>(() => {
    if (filteredData.length === 0) return null;
    const values = filteredData
      .map((d) => d.value)
      .filter((v): v is number => Number.isFinite(v));
    if (values.length === 0) return null;
    return [Math.min(...values), Math.max(...values)];
  }, [filteredData]);

  // Compute yAxis min / max / interval together so the grid splitLines fall
  // on equidistant steps with the survey thresholds (normalRange) anchored
  // EXACTLY on a split. Without this, ECharts auto-picks "nice" tick values
  // (every 0.05, 0.1, …) that almost-never coincide with normalRange.min /
  // normalRange.max — the survey markLines then sit a hair away from a grid
  // tick and the eye reads it as uneven spacing.
  //
  // Strategy when normalRange is present:
  //   step = (normalRange.max - normalRange.min) / 4  → 4 splits inside the
  //   survey band, plus extra splits above/below sized to also include the
  //   data extent. Since axis.min = normalRange.min - K*step, every tick is
  //   a multiple of step measured from normalRange.min, so .min and .max
  //   land on a tick by construction.
  //
  // Without normalRange we fall back to 5 equidistant splits with 8 %
  // padding around the data extent (data-driven, no survey anchor).
  const yAxisConfig = useMemo<{ min: number; max: number; interval: number; decimals: number }>(() => {
    if (!dataExtent) return { min: 0, max: 100, interval: 25, decimals: 0 };
    const [dMin, dMax] = dataExtent;

    if (normalRange && Number.isFinite(normalRange.min) && Number.isFinite(normalRange.max) && normalRange.max > normalRange.min) {
      const step = (normalRange.max - normalRange.min) / 4;
      const stepsBelow = Math.max(1, Math.ceil((normalRange.min - dMin) / step) + 1);
      const stepsAbove = Math.max(1, Math.ceil((dMax - normalRange.max) / step) + 1);
      const aMin = normalRange.min - stepsBelow * step;
      const aMax = normalRange.max + stepsAbove * step;
      const decimals = Math.max(0, Math.min(4, Math.ceil(-Math.log10(step))));
      return { min: aMin, max: aMax, interval: step, decimals };
    }

    const pad = (dMax - dMin) * 0.08 || Math.abs(dMax) * 0.08 || 1;
    const aMin = dMin - pad;
    const aMax = dMax + pad;
    const step = (aMax - aMin) / 5;
    const decimals = step > 0 && Number.isFinite(step)
      ? Math.max(0, Math.min(4, Math.ceil(-Math.log10(step))))
      : 2;
    return { min: aMin, max: aMax, interval: step, decimals };
  }, [dataExtent, normalRange]);

  const yAxisDecimals = yAxisConfig.decimals;

  const displayUnit = unit || '';
  const effectiveNormalRange = aiMetadata?.normal_range || normalRange;
  const effectiveWarningRange = aiMetadata?.warning_range || warningRange;
  const currentValue = filteredData.length > 0 ? filteredData[filteredData.length - 1].value : 0;
  const showLive = isLive ?? mode === 'realtime';

  // Inference markers (B15.4):
  //  - Per-sensor in-session events come from the WS ring buffer in
  //    TelemetryContext and surface as markPoint pins sitting at the top
  //    of yDomain so they don't overlap the trace.
  //  - HISTORIC plant-level events come from /api/inferences/history (the
  //    `__plant__` sentinel) and surface as dashed vertical markLines that
  //    cross every series. Per-sensor HISTORIC is the B17 follow-up.
  const sensorInferences = useSensorInferences(displayTag);
  const plantHistoryQuery = useInferenceHistory(startTs, endTs, {
    enabled: mode === 'historic',
  });

  const markPointData = useMemo(() => {
    if (sensorInferences.length === 0) return [];
    // Anchor pins to the top of the data extent. ECharts honours coordinate
    // values outside the rendered range, so the pin sits visually at the
    // upper edge regardless of yAxis padding. Without dataExtent (empty
    // series) we'd have no inferences to render anyway.
    const topY = dataExtent ? dataExtent[1] : 0;
    return sensorInferences
      .filter((e) => e.ts >= startTs && e.ts <= endTs)
      .map((e) => ({
        coord: [e.ts, topY] as [number, number],
        itemStyle: { color: severityColor(e.level) },
        symbol: 'pin',
        symbolSize: 22,
        label: { show: false },
        value: e.levelName,
      }));
  }, [sensorInferences, startTs, endTs, dataExtent]);

  const markLineData = useMemo(() => {
    const events = plantHistoryQuery.data?.events ?? [];
    if (events.length === 0) return [];
    return events
      .filter((e) => e.inference_ts >= startTs && e.inference_ts <= endTs)
      .map((e) => ({
        xAxis: e.inference_ts,
        lineStyle: {
          color: severityColor(e.level),
          type: 'dashed' as const,
          width: 1,
          opacity: 0.6,
        },
        label: { show: false },
      }));
  }, [plantHistoryQuery.data, startTs, endTs]);

  // markArea is reserved for AI-inferred ranges (semántica del modelo).
  // Survey ranges (passed via normalRange/warningRange) intentionally do NOT
  // render as bands — they appear as discrete markLine thresholds below.
  // The string sentinels 'min'/'max' tell ECharts to clamp to the rendered
  // y extent instead of needing a numeric upper/lower bound.
  const markAreaData: Array<Array<Record<string, unknown>>> = [];
  if (aiMetadata?.warning_range) {
    markAreaData.push(
      [{ yAxis: 'min', itemStyle: { color: 'rgba(245, 158, 11, 0.1)' } }, { yAxis: aiMetadata.warning_range.min }],
      [{ yAxis: aiMetadata.warning_range.max, itemStyle: { color: 'rgba(245, 158, 11, 0.1)' } }, { yAxis: 'max' }],
    );
  }
  if (aiMetadata?.normal_range) {
    markAreaData.push([
      { yAxis: aiMetadata.normal_range.min, itemStyle: { color: 'rgba(16, 185, 129, 0.1)' } },
      { yAxis: aiMetadata.normal_range.max },
    ]);
  }

  // markLine for survey thresholds (normalRange / warningRange props). These
  // are the operating limits from the sensor survey — they signal "you're
  // at the limit", they do NOT frame the axis.
  //
  // ECharts canvas renderer does NOT resolve CSS variables, so we use the
  // explicit hex from src/styles/themes/scada.css (kept in sync there). A
  // long-dash pattern + value label on the line clearly distinguishes the
  // threshold from the muted grid splitLines (which are short-dash, opacity
  // 0.2). Without the label the line looks like just another grid mark.
  const SURVEY_NORMAL_COLOR = '#3fb950';
  const SURVEY_WARNING_COLOR = '#d29922';
  const surveyLineStyle = (color: string) => ({
    color,
    type: [6, 4] as [number, number],
    width: 1.2,
    opacity: 0.85,
  });
  const surveyLabel = (color: string, text: string) => ({
    show: true,
    position: 'insideEndTop' as const,
    formatter: text,
    color,
    fontSize: 10,
    fontWeight: 600,
    backgroundColor: 'rgba(13, 17, 23, 0.7)',
    padding: [2, 4] as [number, number],
    borderRadius: 2,
  });
  const surveyMarkLines: Array<Record<string, unknown>> = [];
  if (normalRange) {
    surveyMarkLines.push(
      { yAxis: normalRange.min, lineStyle: surveyLineStyle(SURVEY_NORMAL_COLOR), label: surveyLabel(SURVEY_NORMAL_COLOR, `min ${normalRange.min}`) },
      { yAxis: normalRange.max, lineStyle: surveyLineStyle(SURVEY_NORMAL_COLOR), label: surveyLabel(SURVEY_NORMAL_COLOR, `max ${normalRange.max}`) },
    );
  }
  if (warningRange) {
    surveyMarkLines.push(
      { yAxis: warningRange.min, lineStyle: surveyLineStyle(SURVEY_WARNING_COLOR), label: surveyLabel(SURVEY_WARNING_COLOR, `warn ${warningRange.min}`) },
      { yAxis: warningRange.max, lineStyle: surveyLineStyle(SURVEY_WARNING_COLOR), label: surveyLabel(SURVEY_WARNING_COLOR, `warn ${warningRange.max}`) },
    );
  }
  const combinedMarkLineData = [...surveyMarkLines, ...markLineData];

  // Capture translation strings for tooltip formatter (closures can't call hooks)
  const tooltipNormal = t('normal');
  const tooltipWarning = t('warningRange');
  const tooltipOutOfRange = t('outOfRange');

  const option = {
    tooltip: {
      ...DARK_TOOLTIP,
      trigger: 'axis',
      axisPointer: {
        type: 'cross',
        label: { backgroundColor: '#1c2330' },
        lineStyle: { color: ATLAXIA_COLORS.textMuted, opacity: 0.5 },
        crossStyle: { color: ATLAXIA_COLORS.textMuted, opacity: 0.5 },
      },
      formatter: (params: unknown) => {
        const p = (params as Array<{ axisValue: number; value: [number, number | null] }>)[0];
        if (!p) return '';
        const raw = Array.isArray(p.value) ? p.value[1] : Number(p.value);
        if (raw == null || Number.isNaN(raw)) return '';
        const value = raw;

        let status = tooltipNormal;
        let statusColor = '#10B981';

        if (effectiveNormalRange) {
          if (value < effectiveNormalRange.min || value > effectiveNormalRange.max) {
            if (effectiveWarningRange) {
              if (value < effectiveWarningRange.min || value > effectiveWarningRange.max) {
                status = tooltipOutOfRange;
                statusColor = '#EF4444';
              } else {
                status = tooltipWarning;
                statusColor = '#F59E0B';
              }
            } else {
              status = tooltipOutOfRange;
              statusColor = '#F59E0B';
            }
          }
        }

        return `<div style="font-size:12px">
          <div style="font-weight:500">${formatDateTime(p.axisValue)}</div>
          <div>${value.toFixed(4)}${displayUnit ? ` ${displayUnit}` : ''}</div>
          <div style="color:${statusColor}">${status}</div>
        </div>`;
      },
    },
    grid: {
      left: 50,
      right: 8,
      top: 8,
      bottom: showBrush ? 60 : 24,
      containLabel: true,
    },
    xAxis: {
      type: 'time',
      // Anchor the axis to the requested window (REALTIME advances with the
      // wall-clock tick above; HISTORIC uses the snapped bucket boundaries).
      // Without explicit min/max ECharts would shrink the axis to the data
      // extent and hide the empty span that conveys "no data here".
      min: mode === 'realtime' ? Date.now() - (endTs - startTs) : startTs,
      max: mode === 'realtime' ? Date.now() : endTs,
      ...axisDefaults,
      axisLabel: { ...axisDefaults.axisLabel, fontSize: 10 },
      splitLine: { show: false },
    },
    yAxis: {
      type: 'value',
      // Explicit min/max/interval (computed above): survey-anchored when
      // normalRange is set so the markLines for the thresholds land EXACTLY
      // on a grid tick — eliminates the "two lines stuck together" effect
      // and gives equidistant splitLines across the chart. Falls back to
      // data-driven 8 % padding when no survey range is available.
      ...axisDefaults,
      axisLabel: {
        ...axisDefaults.axisLabel,
        fontSize: 10,
        formatter: (value: number) => (value ?? 0).toFixed(yAxisDecimals),
      },
      min: yAxisConfig.min,
      max: yAxisConfig.max,
      interval: yAxisConfig.interval,
      splitLine: {
        show: true,
        lineStyle: {
          color: axisDefaults.splitLine?.lineStyle?.color ?? '#21262d',
          opacity: 0.2,
          type: 'dashed' as const,
        },
      },
    },
    dataZoom: showBrush
      ? [
          {
            type: 'slider',
            height: 30,
            bottom: 4,
            borderColor: ATLAXIA_COLORS.primary,
            fillerColor: 'rgba(13, 148, 136, 0.1)',
            handleStyle: { color: ATLAXIA_COLORS.primary },
            textStyle: { fontSize: 10 },
          },
          { type: 'inside' },
        ]
      : [{ type: 'inside' }],
    animation: false,
    series: [
      {
        type: 'line',
        data: seriesData,
        lineStyle: { color: ATLAXIA_COLORS.primary, width: 2 },
        itemStyle: { color: ATLAXIA_COLORS.primary },
        areaStyle: { color: ATLAXIA_COLORS.primary, opacity: 0.06 },
        showSymbol: filteredData.length < 50,
        symbolSize: 4,
        smooth: true,
        // smoothMonotone:'x' kills the spline overshoot that would otherwise
        // invent peaks above/below real samples — fatal for monitoring.
        smoothMonotone: 'x' as const,
        connectNulls: false,
        ...(markAreaData.length > 0
          ? {
              markArea: {
                silent: true,
                data: markAreaData,
              },
            }
          : {}),
        ...(markPointData.length > 0
          ? {
              markPoint: {
                silent: true,
                data: markPointData,
              },
            }
          : {}),
        ...(combinedMarkLineData.length > 0
          ? {
              markLine: {
                silent: true,
                symbol: 'none',
                data: combinedMarkLineData,
                label: { show: false },
              },
            }
          : {}),
      },
    ],
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <span className="font-readout text-sm font-semibold px-2 py-0.5 rounded bg-[var(--bg-inset)] text-[var(--text-primary)] border border-[var(--border-subtle)]">
                {sensorName}
              </span>
              {displayUnit && (
                <span className="text-[var(--text-muted)] font-normal text-xs">({displayUnit})</span>
              )}
            </CardTitle>
            {showLive && <LiveIndicator />}
            {isStale && mode === 'historic' && (
              <span className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
                Refreshing…
              </span>
            )}
            {aiMetadata?.forecast_enabled && (
              <span className="text-xs px-2 py-0.5 bg-[var(--status-advisory-muted)] text-[var(--status-advisory)] rounded-full">
                Forecasting
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <CurrentValue
              value={currentValue}
              unit={displayUnit}
              normalRange={effectiveNormalRange}
            />
            <TimeRangeSelector
              value={timeRange}
              onChange={setTimeRange}
              onPrefetch={handlePrefetch}
            />
            <ExportButton data={filteredData} sensorName={sensorName} unit={displayUnit} />
            <button
              onClick={() => setShowBrush(!showBrush)}
              className={cn(
                'p-1.5 rounded transition-colors',
                showBrush ? 'bg-[var(--bg-inset)] text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:bg-[var(--bg-inset)]'
              )}
              title={t('showBrush')}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
              </svg>
            </button>
          </div>
        </div>

        {effectiveNormalRange && effectiveNormalRange.min != null && effectiveNormalRange.max != null && (
          <div className="text-xs text-[var(--text-secondary)] mt-1">
            {t('normalRange')}: {effectiveNormalRange.min.toFixed(1)} - {effectiveNormalRange.max.toFixed(1)} {displayUnit}
          </div>
        )}
      </CardHeader>

      <CardContent>
        <div className={cn('transition-all', showBrush ? 'h-64' : 'h-52')}>
          {isLoading && filteredData.length === 0 ? (
            <div className="h-full rounded-lg bg-[var(--bg-inset)]/30 animate-pulse" />
          ) : filteredData.length === 0 ? (
            <div className="flex items-center justify-center h-full text-[var(--text-muted)] text-sm">
              {t('noTelemetryData')}
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

        {(effectiveNormalRange || effectiveWarningRange) && (
          <div className="flex items-center justify-center gap-4 mt-2 text-xs text-[var(--text-secondary)]">
            {effectiveNormalRange && (
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-[var(--status-normal)] opacity-30 rounded" />
                <span>{t('normal')}</span>
              </div>
            )}
            {effectiveWarningRange && (
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-[var(--status-warning)] opacity-30 rounded" />
                <span>{t('warningRange')}</span>
              </div>
            )}
            <div className="flex items-center gap-1 text-[var(--text-muted)]">
              <span>{filteredData.length} {t('points')}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
