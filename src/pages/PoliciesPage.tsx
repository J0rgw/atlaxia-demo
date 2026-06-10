import { WhitelistPanel, SnortRulesPanel } from '@/components/network';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { useTranslation } from '@/stores/languageStore';

export function PoliciesPage() {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">
          {t('policiesPageTitle')}
        </h1>
        <p className="text-sm text-[var(--text-secondary)]">
          {t('policiesPageSubtitle')}
        </p>
      </header>

      <ErrorBoundary level="section">
        <WhitelistPanel />
      </ErrorBoundary>

      <ErrorBoundary level="section">
        <SnortRulesPanel />
      </ErrorBoundary>
    </div>
  );
}
