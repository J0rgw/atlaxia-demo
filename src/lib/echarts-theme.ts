import * as echarts from 'echarts/core';
import { BarChart, LineChart, RadarChart, PieChart, ScatterChart } from 'echarts/charts';
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
  MarkAreaComponent,
  MarkLineComponent,
  RadarComponent,
  ToolboxComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

// Register only the chart types and components we use (tree-shaking)
echarts.use([
  BarChart,
  LineChart,
  RadarChart,
  PieChart,
  ScatterChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
  MarkAreaComponent,
  MarkLineComponent,
  RadarComponent,
  ToolboxComponent,
  CanvasRenderer,
]);

// Color palette matching ISA-101 design tokens from index.css
export const ATLAXIA_COLORS = {
  primary: '#58a6ff',
  primaryHover: '#79b8ff',
  primaryLight: '#58a6ff33',
  primary400: '#58a6ff',
  secondary: '#3fb950',
  secondaryLight: '#3fb95033',
  success: '#3fb950',
  warning: '#d29922',
  error: '#f85149',
  emergency: '#f85149',
  grid: '#21262d',
  gridDark: '#21262d',
  textPrimary: '#e6edf3',
  textSecondary: '#8b949e',
  textMuted: '#6e7681',
  bgCard: '#161b22',
  bgCardDark: '#161b22',
} as const;

// Dark tooltip reused across all charts
export const DARK_TOOLTIP = {
  backgroundColor: '#1c2330',
  borderColor: 'transparent',
  borderWidth: 0,
  borderRadius: 8,
  textStyle: { color: '#e6edf3', fontSize: 12, fontFamily: 'IBM Plex Sans, system-ui, sans-serif' },
  padding: [8, 12],
} as const;

// Axis defaults: no axis line, no ticks, muted text, dashed grid
export const AXIS_DEFAULTS = {
  axisLine: { show: false },
  axisTick: { show: false },
  axisLabel: { color: '#8b949e', fontSize: 12, fontFamily: 'IBM Plex Sans, system-ui, sans-serif' },
  splitLine: { lineStyle: { color: '#21262d', type: 'dashed' as const } },
};

// Dark mode axis overrides
export const AXIS_DEFAULTS_DARK = {
  ...AXIS_DEFAULTS,
  axisLabel: { ...AXIS_DEFAULTS.axisLabel, color: '#8b949e' },
  splitLine: { lineStyle: { color: '#21262d', type: 'dashed' as const } },
};

// Series color palette for multi-series charts (ISA-101 design.md palette)
export const SERIES_PALETTE = [
  '#58a6ff', // Series 1
  '#3fb950', // Series 2
  '#d29922', // Series 3
  '#bc8cff', // Series 4
  '#f0883e', // Series 5
  '#f778ba', // Series 6
  ATLAXIA_COLORS.error,
  ATLAXIA_COLORS.primary,
] as const;

// Register custom themes
echarts.registerTheme('atlaxia', {
  backgroundColor: 'transparent',
  textStyle: { color: ATLAXIA_COLORS.textPrimary, fontFamily: 'IBM Plex Sans, system-ui, sans-serif' },
  color: [...SERIES_PALETTE],
});

echarts.registerTheme('atlaxia-dark', {
  backgroundColor: 'transparent',
  textStyle: { color: '#e6edf3', fontFamily: 'IBM Plex Sans, system-ui, sans-serif' },
  color: [...SERIES_PALETTE],
});

export { echarts };
