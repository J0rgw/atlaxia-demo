import { useMemo } from 'react';
import { EventLog } from '@/components/dashboard';
import { useActiveAlarms } from '@/hooks/useOverviewData';
import { useNetworkAlerts } from '@/hooks/useNetwork';
import { buildEventLog } from '@/lib/widgetTransforms';

export function EventLogWidget() {
  const alarmsQuery = useActiveAlarms(10000);
  const networkAlertsQuery = useNetworkAlerts({ limit: 50 });

  const events = useMemo(
    () => buildEventLog(alarmsQuery.data?.alarms, networkAlertsQuery.data?.alerts),
    [alarmsQuery.data, networkAlertsQuery.data],
  );

  return <EventLog events={events} />;
}
