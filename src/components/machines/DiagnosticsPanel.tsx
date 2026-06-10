import { ChevronDown, ChevronRight, Bug, WifiOff, RefreshCw, AlertCircle, Radio, Zap } from 'lucide-react';
import { useTranslation } from '@/stores/languageStore';
import { formatElapsedSeconds } from '@/lib/timeUtils';
import type { DataFreshness } from '@/contexts/TelemetryContext';
import type { ConnectionStatus } from '@/hooks/useTelemetryWebSocket';

export interface DiagnosticInfo {
  lastFetchTime: number | null;
  receivedSensorsCount: number;
  mappedSensorsCount: number;
  unmappedKeys: string[];
  connectionStatus: ConnectionStatus;
  dataFreshness: DataFreshness;
  isLive: boolean;
  secondsSinceUpdate: number | null;
}

interface DiagnosticsPanelProps {
  diagnostics: DiagnosticInfo;
  isOpen: boolean;
  onToggle: () => void;
  onReconnect: () => void;
}

export function DiagnosticsPanel({
  diagnostics,
  isOpen,
  onToggle,
  onReconnect,
}: DiagnosticsPanelProps) {
  const { t } = useTranslation();

  const formatTime = (seconds: number | null) =>
    formatElapsedSeconds(seconds, t('never'));

  const connectionColors: Record<ConnectionStatus, string> = {
    connecting: 'text-[var(--status-advisory)]',
    connected: 'text-[var(--status-normal)]',
    reconnecting: 'text-[var(--status-warning)]',
    disconnected: 'text-[var(--status-critical)]',
    fallback: 'text-[var(--status-warning)]',
  };

  const freshnessColors: Record<DataFreshness, string> = {
    live: 'text-[var(--status-normal)]',
    recent: 'text-[var(--status-advisory)]',
    stale: 'text-[var(--status-warning)]',
    'no-data': 'text-[var(--status-critical)]',
  };

  const ConnectionIcon = () => {
    switch (diagnostics.connectionStatus) {
      case 'connected':
        return <Zap className="w-4 h-4 text-[var(--status-normal)]" />;
      case 'fallback':
        return <RefreshCw className="w-4 h-4 text-[var(--status-warning)]" />;
      case 'reconnecting':
        return <Radio className="w-4 h-4 text-[var(--status-warning)] animate-pulse" />;
      case 'connecting':
        return <Radio className="w-4 h-4 text-[var(--status-advisory)] animate-pulse" />;
      default:
        return <WifiOff className="w-4 h-4 text-[var(--status-critical)]" />;
    }
  };

  return (
    <div className="bg-[var(--bg-inset)] text-[var(--text-primary)] rounded-lg overflow-hidden font-readout text-xs border border-[var(--border-subtle)] transition-colors">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-[var(--bg-inset)] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Bug className="w-4 h-4 text-[var(--status-warning)]" />
          <span className="font-semibold">{t('diagnosticsPanel')}</span>
          {diagnostics.isLive && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 bg-[var(--status-normal-muted)] text-[var(--status-normal)] rounded text-[10px]">
              <span className="w-1.5 h-1.5 bg-[var(--status-normal)] rounded-full animate-pulse" />
              LIVE
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <ConnectionIcon />
          {isOpen ? (
            <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
          ) : (
            <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />
          )}
        </div>
      </button>

      {isOpen && (
        <div className="px-3 pb-3 space-y-3 border-t border-[var(--border-subtle)]">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-3">
            <div className="bg-[var(--bg-surface)] rounded p-2 border border-[var(--border-subtle)]">
              <div className="text-[var(--text-secondary)] text-[10px] uppercase tracking-wide">{t('connection')}</div>
              <div className={`mt-1 flex items-center gap-1 ${connectionColors[diagnostics.connectionStatus]}`}>
                <ConnectionIcon />
                <span className="capitalize">{diagnostics.connectionStatus}</span>
              </div>
            </div>

            <div className="bg-[var(--bg-surface)] rounded p-2 border border-[var(--border-subtle)]">
              <div className="text-[var(--text-secondary)] text-[10px] uppercase tracking-wide">{t('data')}</div>
              <div className={`mt-1 flex items-center gap-1 ${freshnessColors[diagnostics.dataFreshness]}`}>
                {diagnostics.dataFreshness === 'live' && <Zap className="w-3 h-3" />}
                {diagnostics.dataFreshness === 'stale' && <AlertCircle className="w-3 h-3" />}
                <span className="capitalize">{diagnostics.dataFreshness}</span>
              </div>
            </div>

            <div className="bg-[var(--bg-surface)] rounded p-2 border border-[var(--border-subtle)]">
              <div className="text-[var(--text-secondary)] text-[10px] uppercase tracking-wide">{t('lastUpdate')}</div>
              <div className="flex items-center gap-1 mt-1">
                <RefreshCw className={`w-3 h-3 ${diagnostics.isLive ? 'text-[var(--status-normal)]' : 'text-[var(--text-muted)]'}`} />
                <span>{formatTime(diagnostics.secondsSinceUpdate)}</span>
              </div>
            </div>

            <div className="bg-[var(--bg-surface)] rounded p-2 border border-[var(--border-subtle)]">
              <div className="text-[var(--text-secondary)] text-[10px] uppercase tracking-wide">{t('sensors')}</div>
              <div className="mt-1">
                <span className="text-[var(--status-normal)]">{diagnostics.mappedSensorsCount}</span>
                <span className="text-[var(--text-muted)]"> / </span>
                <span>{diagnostics.receivedSensorsCount}</span>
                <span className="text-[var(--text-muted)] ml-1">{t('mapped')}</span>
              </div>
            </div>

            <div className="bg-[var(--bg-surface)] rounded p-2 border border-[var(--border-subtle)] flex items-center justify-center">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onReconnect();
                }}
                className="px-2 py-1 bg-[var(--bg-inset)] hover:bg-[var(--bg-inset)] rounded text-[10px] uppercase tracking-wide transition-colors"
              >
                {t('reconnect')}
              </button>
            </div>
          </div>

          {diagnostics.unmappedKeys.length > 0 && (
            <div className="bg-[var(--status-warning-muted)] border border-[var(--status-warning)] rounded p-2">
              <div className="text-[var(--status-warning)] text-[10px] uppercase tracking-wide mb-1">
                {t('unmappedKeys')} ({diagnostics.unmappedKeys.length})
              </div>
              <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                {diagnostics.unmappedKeys.slice(0, 20).map((key) => (
                  <span
                    key={key}
                    className="bg-[var(--bg-inset)] px-1.5 py-0.5 rounded text-[10px] text-[var(--text-secondary)]"
                  >
                    {key}
                  </span>
                ))}
                {diagnostics.unmappedKeys.length > 20 && (
                  <span className="text-[var(--text-secondary)] text-[10px]">
                    +{diagnostics.unmappedKeys.length - 20} more
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
