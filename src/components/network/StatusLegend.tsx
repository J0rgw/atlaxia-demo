import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { useTranslation } from '@/stores/languageStore';

export function StatusLegend() {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>{t('statusLegend')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[var(--status-normal)] shrink-0" />
            <span className="text-xs text-[var(--text-secondary)]">{t('authorized')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[var(--status-critical)] shrink-0" />
            <span className="text-xs text-[var(--text-secondary)]">{t('notAuthorized')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[var(--bg-base)] shrink-0" />
            <span className="text-xs text-[var(--text-secondary)]">{t('critical')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full border-2 border-[var(--text-muted)] bg-[var(--bg-surface)] shrink-0" />
            <span className="text-xs text-[var(--text-secondary)]">{t('notCritical')}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[var(--bg-base)] shrink-0" />
            <span className="text-xs text-[var(--text-secondary)]">{t('repairable')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full border-2 border-[var(--text-muted)] bg-[var(--bg-surface)] shrink-0" />
            <span className="text-xs text-[var(--text-secondary)]">{t('notRepairable')}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
