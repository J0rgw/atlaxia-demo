/**
 * Step 3: Pages Configuration
 * Configures: pages_config.enabled, pages_config.default
 */

import { useInstallationStore } from '@/stores/installationStore';
import { AVAILABLE_PAGES, type PageId } from '@/types/installation';
import { cn } from '@/lib/utils';

export function PagesStep() {
  const { setupData, updatePagesConfig } = useInstallationStore();
  const { pages_config } = setupData;

  const handleTogglePage = (pageId: PageId) => {
    const isEnabled = pages_config.enabled.includes(pageId);

    if (isEnabled) {
      // Don't allow disabling if it's the only enabled page
      if (pages_config.enabled.length === 1) return;

      const newEnabled = pages_config.enabled.filter((p) => p !== pageId);

      // If disabling the default page, set a new default
      const newDefault = pages_config.default === pageId ? newEnabled[0] : pages_config.default;

      updatePagesConfig({
        enabled: newEnabled,
        default: newDefault,
      });
    } else {
      updatePagesConfig({
        enabled: [...pages_config.enabled, pageId],
      });
    }
  };

  const handleSetDefault = (pageId: PageId) => {
    if (pages_config.enabled.includes(pageId)) {
      updatePagesConfig({ default: pageId });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">Paginas Habilitadas</h2>
        <p className="text-[var(--text-secondary)]">
          Selecciona las paginas que estaran disponibles para los usuarios de esta instalacion.
        </p>
      </div>

      <div className="space-y-3">
        {AVAILABLE_PAGES.map((page) => {
          const isEnabled = pages_config.enabled.includes(page.id);
          const isDefault = pages_config.default === page.id;
          const isOnlyEnabled = isEnabled && pages_config.enabled.length === 1;

          return (
            <div
              key={page.id}
              className={cn(
                'flex items-center justify-between p-4 rounded-lg border transition-colors',
                isEnabled
                  ? 'border-[var(--status-normal)] bg-[var(--status-normal-muted)]'
                  : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--border-default)]'
              )}
            >
              <div className="flex items-center gap-4">
                <button
                  onClick={() => handleTogglePage(page.id)}
                  disabled={isOnlyEnabled}
                  className={cn(
                    'w-6 h-6 rounded flex items-center justify-center transition-colors',
                    isEnabled
                      ? 'bg-[var(--status-normal)] text-white'
                      : 'border-2 border-[var(--border-default)] text-transparent hover:border-[var(--text-muted)]',
                    isOnlyEnabled && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {isEnabled && (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>

                <div>
                  <div className="flex items-center gap-2">
                    <span className={cn('font-medium', isEnabled ? 'text-[var(--text-primary)]' : 'text-[var(--text-primary)]')}>
                      {page.name}
                    </span>
                    {page.adminOnly && (
                      <span className="px-2 py-0.5 text-xs bg-[var(--status-warning-muted)] text-[var(--status-warning)] rounded">
                        Solo Admin
                      </span>
                    )}
                    {isDefault && (
                      <span className="px-2 py-0.5 text-xs bg-[var(--status-normal)] text-white rounded">
                        Por defecto
                      </span>
                    )}
                  </div>
                  <p className={cn('text-sm', isEnabled ? 'text-[var(--status-normal)]' : 'text-[var(--text-secondary)]')}>
                    {page.descriptionEs}
                  </p>
                </div>
              </div>

              {isEnabled && !isDefault && (
                <button
                  onClick={() => handleSetDefault(page.id)}
                  className="px-3 py-1 text-sm text-[var(--status-normal)] hover:bg-[var(--status-normal-muted)] rounded transition-colors"
                >
                  Establecer por defecto
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="bg-[var(--bg-inset)] rounded-lg p-4 border border-[var(--border-subtle)]">
        <h3 className="font-medium text-[var(--text-primary)] mb-2">Resumen</h3>
        <ul className="text-sm text-[var(--text-secondary)] space-y-1">
          <li>
            <span className="font-medium">{pages_config.enabled.length}</span> paginas habilitadas
          </li>
          <li>
            Pagina por defecto:{' '}
            <span className="font-medium">
              {AVAILABLE_PAGES.find((p) => p.id === pages_config.default)?.name}
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}
