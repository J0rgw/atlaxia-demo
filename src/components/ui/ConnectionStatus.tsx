/**
 * ConnectionStatus Component
 * Shows real-time connection status in the header/navbar:
 * - WebSocket: Connected/Reconnecting/Disconnected/Fallback
 * - Data: Live/Recent/Stale/No Data
 * - Backend: Healthy/Degraded/Down
 * - Sniffer: Active/Inactive/Unknown
 */

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useTelemetryContext, type DataFreshness } from '@/contexts/TelemetryContext';
import type { ConnectionStatus as ConnectionStatusType } from '@/hooks/useTelemetryWebSocket';
import { useTranslation, type TranslationKey } from '@/stores/languageStore';
import { api } from '@/lib/api';
import { useInferenceHealthSummary } from '@/hooks/useInference';
import type { HealthState, InferenceHealthEtl } from '@/types/inference';

type BackendHealth = 'healthy' | 'degraded' | 'down' | 'unknown';
type SnifferStatus = 'active' | 'inactive' | 'unknown';

interface ConnectionStatusProps {
  className?: string;
  showLabels?: boolean;
  compact?: boolean;
}

const CONNECTION_CONFIG: Record<ConnectionStatusType, { color: string; label: string; icon: string }> = {
  connected: { color: 'text-[var(--status-normal)]', label: 'WebSocket', icon: 'connected' },
  connecting: { color: 'text-[var(--status-advisory)]', label: 'Connecting', icon: 'connecting' },
  reconnecting: { color: 'text-[var(--status-warning)]', label: 'Reconnecting', icon: 'reconnecting' },
  disconnected: { color: 'text-[var(--status-critical)]', label: 'Disconnected', icon: 'disconnected' },
  fallback: { color: 'text-[var(--status-warning)]', label: 'HTTP Polling', icon: 'fallback' },
};

const FRESHNESS_CONFIG: Record<DataFreshness, { color: string; label: string }> = {
  live: { color: 'text-[var(--status-normal)]', label: 'Live' },
  recent: { color: 'text-[var(--status-advisory)]', label: 'Recent' },
  stale: { color: 'text-[var(--status-warning)]', label: 'Stale' },
  'no-data': { color: 'text-[var(--status-critical)]', label: 'No Data' },
};

const BACKEND_CONFIG: Record<BackendHealth, { color: string; label: string }> = {
  healthy: { color: 'text-[var(--status-normal)]', label: 'Healthy' },
  degraded: { color: 'text-[var(--status-warning)]', label: 'Degraded' },
  down: { color: 'text-[var(--status-critical)]', label: 'Down' },
  unknown: { color: 'text-[var(--text-muted)]', label: 'Unknown' },
};

const SNIFFER_CONFIG: Record<SnifferStatus, { color: string; labelKey: string }> = {
  active: { color: 'text-[var(--status-normal)]', labelKey: 'snifferActive' },
  inactive: { color: 'text-[var(--status-critical)]', labelKey: 'snifferInactive' },
  unknown: { color: 'text-[var(--text-muted)]', labelKey: 'snifferUnknown' },
};

const PIPELINE_CONFIG: Record<HealthState | 'unknown', { color: string; labelKey: TranslationKey; tooltipKey: TranslationKey }> = {
  ok: {
    color: 'text-[var(--status-normal)]',
    labelKey: 'pipelineOk',
    tooltipKey: 'pipelineOkTooltip',
  },
  warmup: {
    color: 'text-[var(--status-advisory)]',
    labelKey: 'pipelineWarmup',
    tooltipKey: 'pipelineWarmupTooltip',
  },
  degraded: {
    color: 'text-[var(--status-warning)]',
    labelKey: 'pipelineDegraded',
    tooltipKey: 'pipelineDegradedTooltip',
  },
  outage: {
    color: 'text-[var(--status-critical)]',
    labelKey: 'pipelineOutage',
    tooltipKey: 'pipelineOutageTooltip',
  },
  unknown: {
    color: 'text-[var(--text-muted)]',
    labelKey: 'pipelineUnknown',
    tooltipKey: 'pipelineUnknownTooltip',
  },
};

type DataFreshnessSemaphore = 'fresh' | 'stale' | 'disconnected' | 'unknown';

const ETL_FRESHNESS_CONFIG: Record<DataFreshnessSemaphore, { color: string; labelKey: TranslationKey }> = {
  fresh: { color: 'text-[var(--status-normal)]', labelKey: 'dataFresh' },
  stale: { color: 'text-[var(--status-warning)]', labelKey: 'dataStale' },
  disconnected: { color: 'text-[var(--status-critical)]', labelKey: 'dataDisconnected' },
  unknown: { color: 'text-[var(--text-muted)]', labelKey: 'pipelineUnknown' },
};

function classifyEtlFreshness(etl: InferenceHealthEtl | undefined): DataFreshnessSemaphore {
  if (!etl) return 'unknown';
  if (!etl.ok || etl.stale === true) return 'disconnected';
  const ms = etl.data_freshness_ms;
  if (ms === null || ms === undefined) return 'disconnected';
  if (ms <= 30_000) return 'fresh';
  if (ms < 90_000) return 'stale';
  return 'disconnected';
}

function ColorDot({ color, pulse = false }: { color: string; pulse?: boolean }) {
  return (
    <span className="relative flex h-2 w-2">
      {pulse && (
        <span
          className={cn(
            'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
            color.replace('text-', 'bg-')
          )}
        />
      )}
      <span
        className={cn(
          'relative inline-flex rounded-full h-2 w-2',
          color.replace('text-', 'bg-')
        )}
      />
    </span>
  );
}

function ConnectionIcon({ status }: { status: ConnectionStatusType }) {
  const baseClass = 'w-4 h-4';

  switch (status) {
    case 'connected':
      return (
        <svg className={cn(baseClass, 'text-[var(--status-normal)]')} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      );
    case 'connecting':
    case 'reconnecting':
      return (
        <svg className={cn(baseClass, status === 'connecting' ? 'text-[var(--status-advisory)]' : 'text-[var(--status-warning)]', 'animate-spin')} fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      );
    case 'fallback':
      return (
        <svg className={cn(baseClass, 'text-[var(--status-warning)]')} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      );
    case 'disconnected':
    default:
      return (
        <svg className={cn(baseClass, 'text-[var(--status-critical)]')} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
        </svg>
      );
  }
}

export function ConnectionStatus({
  className,
  showLabels = true,
  compact = false,
}: ConnectionStatusProps) {
  const { t } = useTranslation();
  const { connectionStatus, dataFreshness, isLive, reconnect } = useTelemetryContext();
  const [backendHealth, setBackendHealth] = useState<BackendHealth>('unknown');
  const [snifferStatus, setSnifferStatus] = useState<SnifferStatus>('unknown');
  const [isExpanded, setIsExpanded] = useState(false);

  const healthQuery = useInferenceHealthSummary();
  const pipelineState: HealthState | 'unknown' = healthQuery.isError || !healthQuery.data
    ? (healthQuery.isError ? 'outage' : 'unknown')
    : healthQuery.data.state;
  const etlSemaphore = classifyEtlFreshness(healthQuery.data?.etl);
  const pipelineConfig = PIPELINE_CONFIG[pipelineState];
  const etlConfig = ETL_FRESHNESS_CONFIG[etlSemaphore];

  // Check backend health periodically
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await api.get<{ status: string }>('/health');
        setBackendHealth(response.status === 'healthy' ? 'healthy' : 'degraded');
      } catch {
        setBackendHealth('down');
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  // Check sniffer status periodically
  useEffect(() => {
    const checkSniffer = async () => {
      try {
        const response = await api.get<{ status: string }>('/api/network/sniffer/status');
        setSnifferStatus(response.status as SnifferStatus);
      } catch {
        setSnifferStatus('unknown');
      }
    };

    checkSniffer();
    const interval = setInterval(checkSniffer, 30000);
    return () => clearInterval(interval);
  }, []);

  const connectionConfig = CONNECTION_CONFIG[connectionStatus];
  const freshnessConfig = FRESHNESS_CONFIG[dataFreshness];
  const backendConfig = BACKEND_CONFIG[backendHealth];
  const snifferConfig = SNIFFER_CONFIG[snifferStatus];

  if (compact) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <ColorDot color={connectionConfig.color} pulse={isLive} />
        <ColorDot color={freshnessConfig.color} />
        <ColorDot color={backendConfig.color} />
        <ColorDot color={snifferConfig.color} pulse={snifferStatus === 'active'} />
        <ColorDot color={pipelineConfig.color} pulse={pipelineState === 'ok'} />
        <ColorDot color={etlConfig.color} pulse={etlSemaphore === 'fresh'} />
      </div>
    );
  }

  return (
    <div className={cn('relative', className)}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors',
          'bg-[var(--bg-inset)] hover:bg-[var(--bg-surface-raised)]'
        )}
      >
        <ConnectionIcon status={connectionStatus} />
        {showLabels && (
          <span className={cn('text-xs font-medium', connectionConfig.color)}>
            {connectionConfig.label}
          </span>
        )}
        <ColorDot color={freshnessConfig.color} pulse={isLive} />
      </button>

      {isExpanded && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-[var(--bg-surface-raised)] rounded-md border border-[var(--border-default)] p-3 z-50">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--text-muted)] uppercase tracking-wide">
                Connection
              </span>
              <div className={cn('flex items-center gap-1.5', connectionConfig.color)}>
                <ColorDot color={connectionConfig.color} pulse={connectionStatus === 'connected'} />
                <span className="text-xs font-medium">{connectionConfig.label}</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--text-muted)] uppercase tracking-wide">
                Data
              </span>
              <div className={cn('flex items-center gap-1.5', freshnessConfig.color)}>
                <ColorDot color={freshnessConfig.color} pulse={isLive} />
                <span className="text-xs font-medium">{freshnessConfig.label}</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--text-muted)] uppercase tracking-wide">
                Backend
              </span>
              <div className={cn('flex items-center gap-1.5', backendConfig.color)}>
                <ColorDot color={backendConfig.color} />
                <span className="text-xs font-medium">{backendConfig.label}</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--text-muted)] uppercase tracking-wide">
                {t('snifferStatus')}
              </span>
              <div className={cn('flex items-center gap-1.5', snifferConfig.color)}>
                <ColorDot color={snifferConfig.color} pulse={snifferStatus === 'active'} />
                <span className="text-xs font-medium">{t(snifferConfig.labelKey as Parameters<typeof t>[0])}</span>
              </div>
            </div>

            <div
              className="flex items-center justify-between"
              title={t(pipelineConfig.tooltipKey)}
            >
              <span className="text-xs text-[var(--text-muted)] uppercase tracking-wide">
                {t('pipelineLabel')}
              </span>
              <div className={cn('flex items-center gap-1.5', pipelineConfig.color)}>
                <ColorDot color={pipelineConfig.color} pulse={pipelineState === 'ok'} />
                <span className="text-xs font-medium">{t(pipelineConfig.labelKey)}</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--text-muted)] uppercase tracking-wide">
                {t('dataLabel')}
              </span>
              <div className={cn('flex items-center gap-1.5', etlConfig.color)}>
                <ColorDot color={etlConfig.color} pulse={etlSemaphore === 'fresh'} />
                <span className="text-xs font-medium">{t(etlConfig.labelKey)}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-[var(--border-subtle)]">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  reconnect();
                  setIsExpanded(false);
                }}
                className="w-full px-3 py-1.5 text-xs font-medium text-white bg-[var(--accent-primary)] hover:brightness-110 rounded-sm transition-colors"
              >
                Reconnect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function ConnectionStatusBadge({ className }: { className?: string }) {
  const { connectionStatus, isLive } = useTelemetryContext();
  const config = CONNECTION_CONFIG[connectionStatus];

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <ColorDot color={config.color} pulse={isLive} />
      <span className={cn('text-xs font-medium', config.color)}>
        {isLive ? 'Live' : config.label}
      </span>
    </div>
  );
}

export default ConnectionStatus;
