import { Card, CardContent } from '@/components/ui/Card';
import { LiveIndicator } from './LiveIndicator';
import { useProcessCriticality, PROCESS_IDS, type ProcessId, type ProcessCriticalityEntry } from '@/hooks/useProcessCriticality';
import { getProcessById } from '@/config/sensors';
import { levelToStatusToken, levelToStatusMutedToken, GAUGE_LEVELS, clampLevel } from '@/lib/inferenceLevel';
import { useTranslation, type TranslationKey } from '@/stores/languageStore';
import { cn } from '@/lib/utils';

const PROCESS_SHORT_NAMES: Record<ProcessId, string> = {
  P1: 'Captacion',
  P2: 'Dosificacion',
  P3: 'Ultrafiltracion',
  P4: 'Decloracion UV',
  P5: 'Osmosis Inversa',
  P6: 'Retrolavado',
};

function processShortName(pid: ProcessId): string {
  return getProcessById(pid)?.name?.replace(/^P\d+\s*-\s*/, '') ?? PROCESS_SHORT_NAMES[pid];
}

interface ColumnProps {
  pid: ProcessId;
  entry: ProcessCriticalityEntry;
  skeleton?: boolean;
}

function GaugeColumn({ pid, entry, skeleton = false }: ColumnProps) {
  const { t } = useTranslation();
  const level = clampLevel(entry.level);
  const isUnknown = skeleton || level < 0 || entry.contributingModel === null;
  const levelLabel = isUnknown ? '—' : `${level}`;
  const nameLabel = isUnknown
    ? t('noData')
    : t(entry.level_name as TranslationKey);
  const tokenColor = isUnknown ? 'var(--text-muted)' : levelToStatusToken(level);

  return (
    <div className="flex flex-col items-center gap-2 min-w-0">
      <div className="w-full text-center min-w-0">
        <p className="text-[10px] font-semibold text-[var(--text-primary)] tracking-wider truncate">
          {pid}
        </p>
        <p className="text-[10px] text-[var(--text-muted)] truncate" title={processShortName(pid)}>
          {processShortName(pid)}
        </p>
      </div>

      <div
        className={cn(
          'w-full flex flex-col-reverse gap-1 rounded border border-[var(--border-subtle)] bg-[var(--bg-inset)]/40 p-1.5',
          skeleton && 'animate-pulse',
        )}
        style={{ height: '160px' }}
        role="meter"
        aria-valuemin={0}
        aria-valuemax={5}
        aria-valuenow={isUnknown ? 0 : level}
        aria-label={`${pid} ${nameLabel}`}
      >
        {GAUGE_LEVELS.map((segLevel) => {
          const lit = !isUnknown && segLevel <= level;
          return (
            <div
              key={segLevel}
              className="flex-1 rounded-sm transition-colors"
              style={{
                backgroundColor: lit
                  ? levelToStatusToken(segLevel)
                  : levelToStatusMutedToken(segLevel),
                opacity: lit ? 1 : 0.35,
                boxShadow: lit ? `0 0 6px ${levelToStatusToken(segLevel)}55` : undefined,
              }}
            />
          );
        })}
      </div>

      <div className="w-full text-center min-w-0">
        <p
          className="font-readout text-base font-bold leading-none"
          style={{ color: tokenColor }}
        >
          {levelLabel}
        </p>
        <p
          className="text-[10px] uppercase tracking-wider truncate font-medium mt-0.5"
          style={{ color: tokenColor }}
          title={nameLabel}
        >
          {nameLabel}
        </p>
      </div>
    </div>
  );
}

export function ProcessCriticalityGauge() {
  const { t } = useTranslation();
  const { status, perProcess, modelCount, error } = useProcessCriticality();

  const isSkeleton = status === 'idle' || status === 'loading';
  const isEmpty = status === 'empty';
  const isAwaitingCalibration = status === 'awaiting-calibration';
  const isError = status === 'error';

  return (
    <Card padding="none">
      <div className="px-4 pt-3 pb-1 flex items-center gap-3 border-b border-[var(--border-subtle)]/40">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wide">
          {t('processStatus')}
        </h3>
        <LiveIndicator />
        {status === 'ready' && modelCount > 0 && (
          <span className="ml-auto text-[10px] text-[var(--text-muted)] font-readout">
            {modelCount} {modelCount === 1 ? 'modelo' : 'modelos'}
          </span>
        )}
      </div>
      <CardContent className="p-3">
        {isError && (
          <div className="h-72 flex flex-col items-center justify-center gap-2 text-sm text-[var(--status-critical)]">
            <span>{t('loadTelemetryError') ?? 'Error'}</span>
            {error?.message && (
              <span className="text-[10px] text-[var(--text-muted)] font-readout">
                {error.message}
              </span>
            )}
          </div>
        )}

        {isAwaitingCalibration && !isError && (
          <div className="h-72 flex flex-col items-center justify-center gap-1 text-center px-6">
            <span className="text-sm font-medium text-[var(--status-advisory)]">
              {t('calibrationPending')}
            </span>
            <span className="text-xs text-[var(--text-muted)] max-w-xs">
              {t('calibrationPendingHint')}
            </span>
          </div>
        )}

        {isEmpty && !isError && !isAwaitingCalibration && (
          <div className="h-72 flex flex-col items-center justify-center gap-1 text-center px-6">
            <span className="text-sm font-medium text-[var(--text-secondary)]">
              {t('awaitingInferences')}
            </span>
            <span className="text-xs text-[var(--text-muted)] max-w-xs">
              {t('awaitingInferencesHint')}
            </span>
          </div>
        )}

        {!isError && !isEmpty && !isAwaitingCalibration && (
          <div className="grid grid-cols-6 gap-2">
            {PROCESS_IDS.map((pid) => (
              <GaugeColumn
                key={pid}
                pid={pid}
                entry={perProcess[pid]}
                skeleton={isSkeleton}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
