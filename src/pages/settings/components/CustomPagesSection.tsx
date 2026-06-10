import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/Switch';
import { useTranslation } from '@/stores/languageStore';
import { useCustomPagesStore } from '@/stores/customPagesStore';
import { resolveIcon, AVAILABLE_PAGE_ICONS } from '@/lib/iconResolver';
import { cn } from '@/lib/utils';

export function CustomPagesSection() {
  const { t, language } = useTranslation();
  const pages = useCustomPagesStore((s) => s.pages);
  const createPage = useCustomPagesStore((s) => s.createPage);
  const updatePage = useCustomPagesStore((s) => s.updatePage);
  const deletePage = useCustomPagesStore((s) => s.deletePage);

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('layout-dashboard');

  const handleCreate = () => {
    if (!newName.trim()) return;
    createPage(newName.trim(), newIcon);
    setNewName('');
    setNewIcon('layout-dashboard');
    setShowCreate(false);
  };

  const handleDelete = (id: Parameters<typeof deletePage>[0]) => {
    if (window.confirm(t('deletePageConfirm'))) {
      deletePage(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            {language === 'es' ? 'Paginas Personalizadas' : 'Custom Pages'}
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            {language === 'es'
              ? 'Crea paginas con los componentes que necesites'
              : 'Create pages with the widgets you need'}
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)} variant="secondary" size="sm">
          <Plus className="w-4 h-4 mr-1.5" />
          {t('createPage')}
        </Button>
      </div>

      {showCreate && (
        <Card className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
              {t('pageName')}
            </label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-[var(--border-default)] rounded-lg bg-[var(--bg-surface)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] outline-none"
              placeholder={language === 'es' ? 'Nombre de la pagina...' : 'Page name...'}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              {t('selectIcon')}
            </label>
            <div className="grid grid-cols-10 gap-1.5">
              {AVAILABLE_PAGE_ICONS.map((iconName) => {
                const Icon = resolveIcon(iconName);
                return (
                  <button
                    key={iconName}
                    onClick={() => setNewIcon(iconName)}
                    className={cn(
                      'p-2 rounded-lg border transition-all flex items-center justify-center',
                      newIcon === iconName
                        ? 'bg-primary-50 dark:bg-primary-900/30 border-primary-500 text-primary-600 dark:text-primary-400'
                        : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-inset)]'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setShowCreate(false);
                setNewName('');
              }}
            >
              {language === 'es' ? 'Cancelar' : 'Cancel'}
            </Button>
            <Button size="sm" onClick={handleCreate} disabled={!newName.trim()}>
              {t('createPage')}
            </Button>
          </div>
        </Card>
      )}

      {pages.length === 0 && !showCreate ? (
        <Card className="flex flex-col items-center justify-center py-12 px-6">
          <p className="text-base font-medium text-[var(--text-secondary)]">
            {t('noCustomPages')}
          </p>
          <p className="text-sm text-[var(--text-muted)] mt-1 text-center max-w-xs">
            {language === 'es'
              ? 'Crea una pagina personalizada para agregar los componentes que necesites'
              : 'Create a custom page to add the widgets you need'}
          </p>
          <Button onClick={() => setShowCreate(true)} variant="secondary" size="sm" className="mt-4">
            <Plus className="w-4 h-4 mr-1.5" />
            {t('createPage')}
          </Button>
        </Card>
      ) : (
        <Card className="divide-y divide-[var(--border-subtle)]">
          {pages.map((page) => {
            const Icon = resolveIcon(page.definition.icon);
            return (
              <div
                key={page.definition.id}
                className="flex items-center justify-between p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[var(--bg-inset)] flex items-center justify-center">
                    <Icon className="w-5 h-5 text-[var(--text-secondary)]" />
                  </div>
                  <div>
                    <p className="font-medium text-[var(--text-primary)]">
                      {page.definition.name}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">
                      /custom/{page.definition.slug}
                      {page.widgets.length > 0 && (
                        <span className="ml-2">
                          {page.widgets.length} {language === 'es' ? 'componentes' : 'widgets'}
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Switch
                    checked={page.definition.enabled}
                    onCheckedChange={(checked) =>
                      updatePage(page.definition.id, { enabled: checked })
                    }
                  />
                  <button
                    onClick={() => handleDelete(page.definition.id)}
                    className="p-1.5 text-[var(--text-muted)] hover:text-[var(--status-critical)] rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}
