import { Link } from 'react-router-dom';
import { Factory, BarChart3, AlertCircle, ArrowRight } from 'lucide-react';
import { KPICard } from '@/components/dashboard';
import { Card } from '@/components/ui/Card';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { useActiveAlarms, useAnomalies } from '@/hooks/useOverviewData';
import { useDevicesOnline } from '@/hooks/useDevicesOnline';
import { buildAlarmsKPI, buildDevicesKPI } from '@/lib/widgetTransforms';
import { useTranslation, type TranslationKey } from '@/stores/languageStore';
import { cn } from '@/lib/utils';
import type { KPIData } from '@/types';

const SKELETON_KPI: KPIData = {
  id: 'skeleton',
  icon: 'efficiency',
  title: '',
  value: '',
  variant: 'neutral',
  loading: true,
};

interface TileProps {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  titleKey: TranslationKey;
  ctaKey: TranslationKey;
}

function ModuleTile({ to, icon: Icon, titleKey, ctaKey }: TileProps) {
  const { t } = useTranslation();
  return (
    <Link
      to={to}
      className={cn(
        'group flex items-center justify-between gap-3 rounded-md border border-[var(--border-subtle)]',
        'bg-[var(--bg-surface)] px-4 py-3 transition-colors hover:bg-[var(--bg-inset)] hover:border-[var(--border-default)]',
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <Icon className="w-5 h-5 text-[var(--accent-primary)] flex-shrink-0" />
        <span className="text-sm font-medium text-[var(--text-primary)] truncate">{t(titleKey)}</span>
      </div>
      <span className="flex items-center gap-1 text-xs text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]">
        {t(ctaKey)}
        <ArrowRight className="w-3.5 h-3.5" />
      </span>
    </Link>
  );
}

export function DataOverviewPage() {
  const { t } = useTranslation();
  const alarmsQuery = useActiveAlarms(10000);
  const devicesOnline = useDevicesOnline();
  const anomaliesQuery = useAnomalies(0.7, 30000);

  const devicesKpi = buildDevicesKPI(
    {
      online: devicesOnline.online,
      total: devicesOnline.total,
      ready: devicesOnline.status === 'ready',
    },
    t,
  );

  const alarmsKpi = alarmsQuery.data
    ? buildAlarmsKPI(alarmsQuery.data, t)
    : { ...SKELETON_KPI, id: 'alarms-skel' };

  const anomalyCount = anomaliesQuery.data?.anomalyCount ?? 0;
  const totalSensors = anomaliesQuery.data?.totalSensors ?? 0;
  const anomalyKpi: KPIData = anomaliesQuery.isLoading
    ? { ...SKELETON_KPI, id: 'anomalies-skel' }
    : {
        id: 'anomalies',
        icon: 'alerts',
        title: t('dataAlerts'),
        value: String(anomalyCount),
        subtitle: totalSensors > 0 ? `${totalSensors} ${t('sensorsMonitored').toLowerCase().replace(/^\d+\s*/, '')}` : undefined,
        variant: anomalyCount === 0 ? 'green' : anomalyCount > 5 ? 'critical' : 'warning',
      };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">{t('dataOverview')}</h1>
        <p className="text-[var(--text-secondary)] text-sm mt-1">{t('dataOverviewSubtitle')}</p>
      </div>

      <ErrorBoundary level="section">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <KPICard data={devicesKpi} />
          <KPICard data={alarmsKpi} />
          <KPICard data={anomalyKpi} />
        </div>
      </ErrorBoundary>

      <Card className="p-4 space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          {t('moduleData')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <ModuleTile to="/plant" icon={Factory} titleKey="plantRealtime" ctaKey="goToPlantRealtime" />
          <ModuleTile to="/telemetry" icon={BarChart3} titleKey="historicTelemetry" ctaKey="goToHistoricTelemetry" />
          <ModuleTile to="/anomalies" icon={AlertCircle} titleKey="dataAlerts" ctaKey="goToDataAlerts" />
        </div>
      </Card>
    </div>
  );
}
