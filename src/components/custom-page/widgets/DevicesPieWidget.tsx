import { DevicesPieChart } from '@/components/network/DevicesPieChart';
import { useNetworkDevices } from '@/hooks/useNetwork';
import { useTranslation } from '@/stores/languageStore';

export function DevicesPieWidget() {
  const { t } = useTranslation();
  const devicesQuery = useNetworkDevices();

  if (devicesQuery.isLoading) {
    return (
      <div className="h-64 rounded-lg bg-[var(--bg-inset)]/30 animate-pulse" />
    );
  }

  if (!devicesQuery.data) {
    return (
      <div className="h-64 flex items-center justify-center text-sm text-[var(--text-muted)]">
        {t('noData')}
      </div>
    );
  }

  return (
    <DevicesPieChart
      deviceCounts={devicesQuery.data.deviceCounts}
      total={devicesQuery.data.total}
    />
  );
}
