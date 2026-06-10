import EChartsReactCore from 'echarts-for-react/lib/core';
import type { EChartsReactProps } from 'echarts-for-react/lib/types';
import { echarts } from '@/lib/echarts-theme';

export type EChartProps = Omit<EChartsReactProps, 'echarts'>;

export function EChart(props: EChartProps) {
  return <EChartsReactCore echarts={echarts} {...props} />;
}
