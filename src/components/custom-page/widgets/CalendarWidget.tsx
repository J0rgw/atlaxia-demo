import { useMemo } from 'react';
import { CalendarGrid } from '@/components/dashboard';
import { useAnomalies } from '@/hooks/useOverviewData';
import { useNetworkAlerts } from '@/hooks/useNetwork';
import { buildCalendarAnomalies } from '@/lib/widgetTransforms';

export function CalendarWidget() {
  const anomaliesQuery = useAnomalies(0.7, 30000);
  const networkAlertsQuery = useNetworkAlerts({ limit: 200 });

  const calendarAnomalies = useMemo(
    () => buildCalendarAnomalies(anomaliesQuery.data),
    [anomaliesQuery.data],
  );

  return (
    <CalendarGrid
      anomalies={calendarAnomalies}
      alerts={networkAlertsQuery.data?.alerts || []}
      onDayClick={() => {}}
    />
  );
}
