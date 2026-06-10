import { useMemo } from 'react';
import { KPICard } from '@/components/dashboard';
import { useActiveAlarms } from '@/hooks/useOverviewData';
import { useInferenceHealthSummary } from '@/hooks/useInference';
import { useDevicesOnline } from '@/hooks/useDevicesOnline';
import { useTranslation } from '@/stores/languageStore';
import { buildPipelineHealthKPI, buildAlarmsKPI, buildDevicesKPI } from '@/lib/widgetTransforms';
import type { KPIData } from '@/types';

const SKELETON_KPI: KPIData = {
  id: 'skeleton',
  icon: 'efficiency',
  title: '',
  value: '',
  variant: 'neutral',
  loading: true,
};

export function KPIStripWidget() {
  const { t } = useTranslation();
  const pipelineHealthQuery = useInferenceHealthSummary();
  const alarmsQuery = useActiveAlarms(10000);
  const devicesOnline = useDevicesOnline();

  const kpis = useMemo(() => [
    pipelineHealthQuery.data ? buildPipelineHealthKPI(pipelineHealthQuery.data, t) : null,
    alarmsQuery.data ? buildAlarmsKPI(alarmsQuery.data, t) : null,
    devicesOnline.status === 'ready'
      ? buildDevicesKPI(
          { online: devicesOnline.online, total: devicesOnline.total, ready: true },
          t,
        )
      : null,
  ], [pipelineHealthQuery.data, alarmsQuery.data, devicesOnline, t]);

  return (
    <div className="grid grid-cols-3 gap-3">
      {kpis.map((kpi, idx) => (
        <KPICard key={kpi?.id ?? `skeleton-${idx}`} data={kpi ?? SKELETON_KPI} />
      ))}
    </div>
  );
}
