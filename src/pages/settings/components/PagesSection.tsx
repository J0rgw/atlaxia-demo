import { Card } from '@/components/ui/Card';
import { Switch } from '@/components/ui/Switch';
import { cn } from '@/lib/utils';
import { AVAILABLE_PAGES } from '@/types/installation';
import type { LocalInstallationConfig } from './InstallationConfigTab';

interface PagesSectionProps {
  localConfig: LocalInstallationConfig;
  setLocalConfig: React.Dispatch<React.SetStateAction<LocalInstallationConfig | null>>;
  language: string;
}

export function PagesSection({ localConfig, setLocalConfig, language }: PagesSectionProps) {
  return (
    <Card padding="lg">
      <h3 className="font-semibold text-[var(--text-primary)] mb-4">
        {language === 'es' ? 'Paginas Habilitadas' : 'Enabled Pages'}
      </h3>

      <div className="space-y-3">
        {AVAILABLE_PAGES.map((page) => {
          const isEnabled = localConfig.pages_config.enabled.includes(page.id);
          const isDefault = localConfig.pages_config.default === page.id;

          return (
            <div
              key={page.id}
              className="flex items-center justify-between p-3 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg"
            >
              <div className="flex items-center gap-3">
                <Switch
                  checked={isEnabled}
                  onCheckedChange={(checked) => {
                    const newEnabled = checked
                      ? [...localConfig.pages_config.enabled, page.id]
                      : localConfig.pages_config.enabled.filter((p) => p !== page.id);

                    let newDefault = localConfig.pages_config.default;
                    if (!checked && isDefault && newEnabled.length > 0) {
                      newDefault = newEnabled[0];
                    }

                    setLocalConfig({
                      ...localConfig,
                      pages_config: {
                        ...localConfig.pages_config,
                        enabled: newEnabled,
                        default: newDefault,
                      },
                    });
                  }}
                />
                <div>
                  <p className="font-medium text-[var(--text-primary)]">{page.name}</p>
                  <p className="text-sm text-[var(--text-secondary)]">
                    {language === 'es' ? page.descriptionEs : page.descriptionEn}
                  </p>
                </div>
              </div>

              {isEnabled && (
                <button
                  onClick={() =>
                    setLocalConfig({
                      ...localConfig,
                      pages_config: { ...localConfig.pages_config, default: page.id },
                    })
                  }
                  className={cn(
                    'px-3 py-1 text-xs font-medium rounded-full transition-colors',
                    isDefault
                      ? 'bg-[var(--status-normal-muted)] text-[var(--status-normal)]'
                      : 'bg-[var(--bg-inset)] text-[var(--text-secondary)] hover:bg-[var(--bg-inset)]'
                  )}
                >
                  {isDefault
                    ? language === 'es'
                      ? 'Por defecto'
                      : 'Default'
                    : language === 'es'
                    ? 'Hacer defecto'
                    : 'Set default'}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
