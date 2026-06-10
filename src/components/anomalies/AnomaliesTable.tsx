import { cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { useTranslation, type TranslationKey } from '@/stores/languageStore';
import type { AnomalyData, LevelName } from '@/types';

interface LevelOverlayEntry {
  level_name: LevelName;
  level: number;
  score: number;
  showVerdict: boolean;
}

interface AnomaliesTableProps {
  anomalies: AnomalyData[];
  threshold?: number;
  /** Per-sensor live overlay from WS canal 'inferences'. Takes precedence over REST. */
  levelOverlay?: Record<string, LevelOverlayEntry>;
}

const LEVEL_COLOR: Record<LevelName, string> = {
  NORMAL: 'bg-[var(--status-normal-muted)] text-[var(--status-normal)]',
  INFO: 'bg-[var(--status-normal-muted)] text-[var(--status-normal)]',
  LOW: 'bg-[var(--status-advisory-muted)] text-[var(--status-advisory)]',
  MEDIUM: 'bg-[var(--status-warning-muted)] text-[var(--status-warning)]',
  HIGH: 'bg-[var(--status-critical-muted)] text-[var(--status-critical)]',
  CRITICAL: 'bg-[var(--status-emergency-muted)] text-[var(--status-emergency)]',
  UNKNOWN: 'bg-[var(--bg-inset)] text-[var(--text-muted)]',
};

export function AnomaliesTable({
  anomalies,
  threshold = 0.7,
  levelOverlay,
}: AnomaliesTableProps) {
  const { t } = useTranslation();

  const sortedAnomalies = [...anomalies].sort(
    (a, b) => b.anomalyIndicator - a.anomalyIndicator
  );

  const groupedByCategory = sortedAnomalies.reduce(
    (acc, anomaly) => {
      if (!acc[anomaly.category]) {
        acc[anomaly.category] = [];
      }
      acc[anomaly.category].push(anomaly);
      return acc;
    },
    {} as Record<string, AnomalyData[]>
  );

  return (
    <Card padding="none">
      <CardHeader className="px-6 pt-6">
        <CardTitle>{t('anomalyDetection')}</CardTitle>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          {t('anomalyThreshold')}: {threshold} | {t('highlightedRows')}
        </p>
      </CardHeader>
      <CardContent className="px-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]">
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                  {t('category')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                  {t('variableName')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                  {t('currentValue')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                  {t('behaviorSeparation')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                  {t('anomalyIndicator')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                  {t('level')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {Object.entries(groupedByCategory).map(([category, items]) =>
                items.map((anomaly, index) => {
                  const overlay = levelOverlay?.[anomaly.sensorKey];
                  const levelName: LevelName = overlay?.level_name ?? 'UNKNOWN';
                  const isCalibrating = overlay !== undefined && !overlay.showVerdict;

                  return (
                    <tr
                      key={anomaly.sensorKey}
                      className={cn(
                        'transition-colors',
                        anomaly.isAnomaly
                          ? 'bg-[var(--status-advisory-muted)]'
                          : 'hover:bg-[var(--bg-inset)]'
                      )}
                    >
                      <td className="px-6 py-4 text-sm font-medium text-[var(--text-primary)]">
                        {index === 0 ? category : ''}
                      </td>
                      <td className="px-6 py-4 text-sm text-[var(--text-primary)]">
                        {anomaly.sensorName}
                      </td>
                      <td className="px-6 py-4 text-sm text-[var(--text-secondary)] text-right font-readout">
                        {anomaly.currentValue.toFixed(4)}
                      </td>
                      <td className="px-6 py-4 text-sm text-[var(--text-secondary)] text-right font-readout">
                        {anomaly.behaviorSeparation.toFixed(4)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span
                          className={cn(
                            'inline-flex px-2 py-1 text-xs font-medium rounded-full font-readout',
                            anomaly.anomalyIndicator >= threshold
                              ? 'bg-[var(--status-critical-muted)] text-[var(--status-critical)]'
                              : 'bg-[var(--bg-inset)] text-[var(--text-secondary)]'
                          )}
                        >
                          {anomaly.anomalyIndicator.toFixed(4)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {isCalibrating ? (
                          <span className="text-xs text-[var(--text-muted)] italic">
                            {t('calibrationPending')}
                          </span>
                        ) : (
                          <span
                            className={cn(
                              'inline-flex px-2 py-1 text-xs font-medium rounded-full font-readout',
                              LEVEL_COLOR[levelName]
                            )}
                          >
                            {t(levelName as TranslationKey)}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
