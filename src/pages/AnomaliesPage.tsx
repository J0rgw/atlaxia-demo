import { useMemo } from 'react';
import { AnomaliesTable } from '@/components/anomalies';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { Card, CardContent } from '@/components/ui/Card';
import { useAnomalies } from '@/hooks/useOverviewData';
import { useTelemetryContext } from '@/contexts/TelemetryContext';
import { useTranslation } from '@/stores/languageStore';
import type { AnomalyData, DeviceEntry, LevelName } from '@/types';

const DEFAULT_THRESHOLD = 0.7;

interface LevelOverlay {
  level_name: LevelName;
  level: number;
  score: number;
  showVerdict: boolean;
}

export function AnomaliesPage() {
  const { t } = useTranslation();
  const anomaliesQuery = useAnomalies(DEFAULT_THRESHOLD);
  const { latestInferenceByModel } = useTelemetryContext();

  // Live overlay (sensorKey -> DeviceEntry) preferring WS over REST.
  // If multiple models report the same sensor, keep the highest level.
  const levelOverlay = useMemo<Record<string, LevelOverlay>>(() => {
    const out: Record<string, LevelOverlay> = {};
    for (const msg of Object.values(latestInferenceByModel)) {
      const devices: Record<string, DeviceEntry> = msg.devices || {};
      for (const [sensorKey, entry] of Object.entries(devices)) {
        const prev = out[sensorKey];
        if (!prev || entry.level > prev.level) {
          out[sensorKey] = {
            level_name: entry.level_name,
            level: entry.level,
            score: entry.score,
            showVerdict: msg.show_verdict,
          };
        }
      }
    }
    return out;
  }, [latestInferenceByModel]);

  const anomalies: AnomalyData[] = anomaliesQuery.data?.anomalies ?? [];
  const threshold = anomaliesQuery.data?.threshold ?? DEFAULT_THRESHOLD;

  // At least one model is still seeded (calibration pending) → gate verdict per row.
  const anyCalibrationPending = useMemo(
    () => Object.values(latestInferenceByModel).some((m) => !m.show_verdict),
    [latestInferenceByModel],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          {t('anomalyDetection')}
        </h1>
        <p className="text-[var(--text-secondary)] mt-1">
          Monitoreo de variables con indicadores de anomalia en tiempo real
        </p>
        {anyCalibrationPending && (
          <p className="mt-2 inline-flex items-center gap-2 text-xs text-[var(--status-advisory)]">
            <span className="w-2 h-2 rounded-full bg-[var(--status-advisory)]" />
            {t('calibrationPending')}
          </p>
        )}
      </div>
      <ErrorBoundary level="section">
        {anomaliesQuery.isLoading ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-[var(--text-muted)]">
              {t('loading')}
            </CardContent>
          </Card>
        ) : anomaliesQuery.isError ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-[var(--status-critical)]">
              {t('loadTelemetryError')}
            </CardContent>
          </Card>
        ) : (
          <AnomaliesTable
            anomalies={anomalies}
            threshold={threshold}
            levelOverlay={levelOverlay}
          />
        )}
      </ErrorBoundary>
    </div>
  );
}
