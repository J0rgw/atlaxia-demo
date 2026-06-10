import { useControlIndicators } from '@/hooks/useOverviewData';
import { RadarChart } from '@/components/control';
import { LiveIndicator } from '@/components/dashboard/LiveIndicator';
import { Card, CardContent } from '@/components/ui/Card';
import { useTranslation } from '@/stores/languageStore';

export function RadarWidget() {
  const { t } = useTranslation();
  const controlQuery = useControlIndicators(15000);

  return (
    <Card padding="none">
      <div className="px-4 pt-3 pb-1 flex items-center gap-3 border-b border-[var(--border-subtle)]/40">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wide">
          {t('indicators')}
        </h3>
        <LiveIndicator />
      </div>
      <CardContent className="p-2">
        <div className="h-72">
          {controlQuery.isLoading ? (
            <div className="h-full rounded-lg bg-[var(--bg-inset)]/30 animate-pulse" />
          ) : controlQuery.data?.indicators ? (
            <RadarChart data={{ ...controlQuery.data.indicators, timestamp: controlQuery.data.timestamp }} compact />
          ) : (
            <div className="h-full flex items-center justify-center text-sm text-[var(--text-muted)]">
              {t('noRecentEvents')}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
