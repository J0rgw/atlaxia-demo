import { useTranslation } from '@/stores/languageStore';

export function CalendarLegend() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap items-center gap-4 mt-4 text-xs text-[var(--text-secondary)]">
      <div className="flex items-center gap-1.5">
        <span className="w-3 h-3 rounded-full ring-2 ring-primary-500 ring-offset-1 bg-white" />
        <span>{t('today')}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="w-3 h-3 rounded-full bg-[var(--status-warning)]" />
        <span>{t('anomaly')}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="w-3 h-3 rounded-full bg-[var(--status-critical)]" />
        <span>{t('emergency')}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="w-3 h-3 rounded-full bg-[var(--bg-inset)]" />
        <span>{t('noEvents')}</span>
      </div>
    </div>
  );
}
