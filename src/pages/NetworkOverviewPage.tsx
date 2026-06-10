import { Link } from 'react-router-dom';
import { Radar, Bell, ArrowRight } from 'lucide-react';
import { KPICard } from '@/components/dashboard';
import { Card } from '@/components/ui/Card';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { useNetworkDevices, useNetworkAlerts } from '@/hooks/useNetwork';
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

export function NetworkOverviewPage() {
  const { t } = useTranslation();
  const devicesQuery = useNetworkDevices();
  const alertsQuery = useNetworkAlerts({ limit: 50 }, 30000);

  const total = devicesQuery.data?.total ?? 0;
  const authorized = devicesQuery.data?.authorized ?? 0;
  const unauthorized = devicesQuery.data?.unauthorized ?? 0;

  const devicesKpi: KPIData = devicesQuery.isLoading
    ? { ...SKELETON_KPI, id: 'net-devices-skel' }
    : {
        id: 'net-devices',
        icon: 'units',
        title: t('devicesOnline'),
        value: `${authorized} / ${total}`,
        subtitle: unauthorized > 0 ? `${unauthorized} ${t('alerts').toLowerCase()}` : undefined,
        variant: unauthorized === 0 ? 'green' : unauthorized > 3 ? 'critical' : 'warning',
      };

  const alertsTotal = alertsQuery.data?.total ?? 0;
  const byType = alertsQuery.data?.byType ?? {};
  const emergencyCount = byType['Emergencia'] ?? 0;
  const alertCount = byType['Alerta'] ?? 0;

  const alertsKpi: KPIData = alertsQuery.isLoading
    ? { ...SKELETON_KPI, id: 'net-alerts-skel' }
    : {
        id: 'net-alerts',
        icon: 'alerts',
        title: t('networkAlerts'),
        value: String(alertsTotal),
        subtitle:
          emergencyCount + alertCount > 0
            ? `${emergencyCount} ${t('emergency').toLowerCase()}, ${alertCount} ${t('alerts').toLowerCase()}`
            : undefined,
        variant: emergencyCount > 0 ? 'critical' : alertCount > 0 ? 'warning' : 'green',
      };

  const criticalCount = devicesQuery.data?.devices.filter((d) => d.status.critical).length ?? 0;
  const criticalKpi: KPIData = devicesQuery.isLoading
    ? { ...SKELETON_KPI, id: 'net-crit-skel' }
    : {
        id: 'net-critical',
        icon: 'alerts',
        title: t('criticalAlerts'),
        value: String(criticalCount),
        subtitle: criticalCount === 0 ? t('normalOperation') : undefined,
        variant: criticalCount === 0 ? 'green' : 'warning',
      };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">{t('networkOverview')}</h1>
        <p className="text-[var(--text-secondary)] text-sm mt-1">{t('networkOverviewSubtitle')}</p>
      </div>

      <ErrorBoundary level="section">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <KPICard data={devicesKpi} />
          <KPICard data={alertsKpi} />
          <KPICard data={criticalKpi} />
        </div>
      </ErrorBoundary>

      <Card className="p-4 space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          {t('moduleNetwork')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <ModuleTile to="/sniffer" icon={Radar} titleKey="currentNetworkState" ctaKey="goToNetworkState" />
          <ModuleTile to="/alerts" icon={Bell} titleKey="networkAlerts" ctaKey="goToNetworkAlerts" />
        </div>
      </Card>
    </div>
  );
}
