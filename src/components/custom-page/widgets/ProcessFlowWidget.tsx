import { useMemo } from 'react';
import { ProcessStrip } from '@/components/machines/ProcessStrip';
import { useProcessStatus } from '@/hooks/useOverviewData';
import { useTranslation } from '@/stores/languageStore';
import { buildProcessFlowStatuses } from '@/lib/widgetTransforms';

export function ProcessFlowWidget() {
  const { t } = useTranslation();
  const processQuery = useProcessStatus();

  const statuses = useMemo(
    () => buildProcessFlowStatuses(processQuery.data),
    [processQuery.data],
  );

  if (processQuery.isLoading) {
    return (
      <div className="h-96 rounded-lg bg-[var(--bg-inset)]/30 animate-pulse" />
    );
  }

  if (statuses.length === 0) {
    return (
      <div className="h-96 flex items-center justify-center text-sm text-[var(--text-muted)]">
        {t('noData')}
      </div>
    );
  }

  return (
    <div className="h-96">
      <ProcessStrip processStatuses={statuses} />
    </div>
  );
}
