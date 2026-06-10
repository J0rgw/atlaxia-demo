import { Card } from '@/components/ui/Card';
import { Switch } from '@/components/ui/Switch';
import { useTranslation } from '@/stores/languageStore';
import { useAuthStore } from '@/stores/authStore';
import { useInstallation } from '@/hooks/useInstallation';
import { useUserViewPrefsStore } from '@/stores/userViewPrefsStore';
import { AVAILABLE_PAGES } from '@/types/installation';

export function TechnicianPagesSection() {
  const { t, language } = useTranslation();
  const canAccessPage = useAuthStore((state) => state.canAccessPage);
  const { enabledPages } = useInstallation();
  const hiddenPages = useUserViewPrefsStore((state) => state.hiddenPages);
  const togglePage = useUserViewPrefsStore((state) => state.togglePage);

  const visiblePages = AVAILABLE_PAGES.filter((page) => {
    if (page.id === 'settings') return false;
    if (enabledPages.length > 0 && !enabledPages.includes(page.id)) return false;
    return canAccessPage(page.id);
  });

  return (
    <Card padding="lg">
      <h3 className="font-semibold text-[var(--text-primary)] mb-1">{t('settingsMyPages')}</h3>
      <p className="text-sm text-[var(--text-secondary)] mb-4">{t('settingsMyPagesDescription')}</p>

      <div className="space-y-2">
        {visiblePages.length === 0 && (
          <p className="text-sm text-[var(--text-muted)] py-4 text-center">
            {language === 'es' ? 'No hay paginas disponibles' : 'No pages available'}
          </p>
        )}
        {visiblePages.map((page) => {
          const isVisible = !hiddenPages.includes(page.id);
          return (
            <div
              key={page.id}
              className="flex items-center justify-between p-3 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-sm"
            >
              <div>
                <p className="font-medium text-sm text-[var(--text-primary)]">{page.name}</p>
                <p className="text-xs text-[var(--text-secondary)]">
                  {language === 'es' ? page.descriptionEs : page.descriptionEn}
                </p>
              </div>
              <Switch
                checked={isVisible}
                onCheckedChange={() => togglePage(page.id)}
                aria-label={page.name}
              />
            </div>
          );
        })}
      </div>
    </Card>
  );
}
