import { AnomalyScatterChart } from '@/components/dashboard';
import { useAnomalies } from '@/hooks/useOverviewData';

export function AnomalyScatterWidget() {
  const anomaliesQuery = useAnomalies(0.7, 30000);

  return (
    <AnomalyScatterChart
      anomalies={anomaliesQuery.data?.anomalies || []}
      threshold={0.7}
      anomalyCount={anomaliesQuery.data?.anomalyCount}
    />
  );
}
