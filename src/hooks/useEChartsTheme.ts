import { useTheme } from '@/providers/ThemeProvider';
import { AXIS_DEFAULTS, AXIS_DEFAULTS_DARK } from '@/lib/echarts-theme';

/**
 * Returns the ECharts theme name and axis defaults based on current dark/light mode.
 */
export function useEChartsTheme() {
  const { mode } = useTheme();
  const isDark = mode === 'dark';

  return {
    theme: isDark ? 'atlaxia-dark' : 'atlaxia',
    isDark,
    axisDefaults: isDark ? AXIS_DEFAULTS_DARK : AXIS_DEFAULTS,
  };
}
