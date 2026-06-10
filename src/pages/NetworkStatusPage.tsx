import { Suspense, lazy } from 'react';
import {
  StatusLegend,
  HardwareOverview,
  DevicesTable,
  DevicesPieChart,
} from '@/components/network';
import { useNetworkDevices } from '@/hooks/useNetwork';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import type { NetworkDevice } from '@/types';

const TopologyGraph = lazy(() =>
  import('@/components/network/TopologyGraph').then((m) => ({ default: m.TopologyGraph }))
);

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-8">
      <svg className="animate-spin h-6 w-6 text-[var(--accent-primary)]" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
      </svg>
    </div>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center py-8">
      <p className="text-[var(--status-critical)]">{message}</p>
    </div>
  );
}

export function NetworkStatusPage() {
  const { data: devicesData, isLoading: devicesLoading, error: devicesError } = useNetworkDevices();

  const devices: NetworkDevice[] = devicesData?.devices ?? [];
  const deviceCounts = devicesData?.deviceCounts ?? [];
  const total = devicesData?.total ?? 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[1fr_auto_auto] gap-4">
        {devicesLoading ? (
          <LoadingSpinner />
        ) : devicesError ? (
          <ErrorMessage message="Error loading devices" />
        ) : (
          <ErrorBoundary level="section">
            <HardwareOverview devices={devices} />
          </ErrorBoundary>
        )}
        {!devicesLoading && !devicesError && (
          <ErrorBoundary level="section">
            <DevicesPieChart deviceCounts={deviceCounts} total={total} />
          </ErrorBoundary>
        )}
        <StatusLegend />
      </div>

      {devicesLoading ? (
        <LoadingSpinner />
      ) : devicesError ? (
        <ErrorMessage message="Error loading devices" />
      ) : (
        <ErrorBoundary level="section">
          <DevicesTable devices={devices} />
        </ErrorBoundary>
      )}

      <ErrorBoundary level="section">
        <Suspense fallback={<LoadingSpinner />}>
          <TopologyGraph />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
