import { useState } from 'react';
import { Plus, Pencil, Trash2, X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { useTranslation } from '@/stores/languageStore';
import {
  useWhitelist,
  useCreateWhitelistEntry,
  useUpdateWhitelistEntry,
  useDeleteWhitelistEntry,
  type WhitelistEntryCreate,
} from '@/hooks/useNetwork';

const EMPTY_FORM: WhitelistEntryCreate = {
  entryType: 'mac',
  pattern: '',
  description: '',
  isActive: true,
  autoAuthorize: true,
  autoCritical: false,
  autoImportance: 'Media',
};

export function WhitelistPanel() {
  const { t } = useTranslation();
  const { data, isLoading } = useWhitelist();
  const createMutation = useCreateWhitelistEntry();
  const updateMutation = useUpdateWhitelistEntry();
  const deleteMutation = useDeleteWhitelistEntry();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<WhitelistEntryCreate>({ ...EMPTY_FORM });

  const entries = data?.entries ?? [];

  const handleCreate = () => {
    createMutation.mutate(form, {
      onSuccess: () => {
        setShowForm(false);
        setForm({ ...EMPTY_FORM });
      },
    });
  };

  const handleUpdate = () => {
    if (editingId === null) return;
    updateMutation.mutate(
      { id: editingId, entry: form },
      {
        onSuccess: () => {
          setEditingId(null);
          setForm({ ...EMPTY_FORM });
        },
      }
    );
  };

  const startEdit = (entry: (typeof entries)[0]) => {
    setEditingId(entry.id);
    setShowForm(false);
    setForm({
      entryType: entry.entryType,
      pattern: entry.pattern,
      description: entry.description || '',
      isActive: entry.isActive,
      autoAuthorize: entry.autoAuthorize,
      autoCritical: entry.autoCritical,
      autoImportance: entry.autoImportance,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setShowForm(false);
    setForm({ ...EMPTY_FORM });
  };

  const inputCls =
    'w-full px-2 py-1 text-sm rounded border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] focus:ring-1 focus:ring-[var(--status-advisory)] focus:border-[var(--status-advisory)]';
  const selectCls = inputCls;

  // Mirar en profundidad y arreglar: submitLabel is declared in the props type
  // but destructured away — it's never used in the function body. The callers
  // pass it (lines 182, 185) but it has no effect. Likely the submit button
  // text was meant to use submitLabel instead of a hardcoded string.
  function FormRow({ onSubmit }: { onSubmit: () => void; submitLabel: string }) {
    return (
      <tr className="bg-[var(--status-advisory-muted)]">
        <td className="px-3 py-2">
          <select value={form.entryType} onChange={(e) => setForm({ ...form, entryType: e.target.value })} aria-label="Entry type" className={selectCls}>
            <option value="mac">MAC</option>
            <option value="mac_prefix">MAC Prefix</option>
            <option value="ip_range">IP Range</option>
          </select>
        </td>
        <td className="px-3 py-2">
          <input
            value={form.pattern}
            onChange={(e) => setForm({ ...form, pattern: e.target.value })}
            placeholder={form.entryType === 'mac' ? '00:1A:2B:3C:4D:5E' : form.entryType === 'mac_prefix' ? '00:1A:2B' : '192.168.1.0/24'}
            aria-label="Pattern"
            className={inputCls}
          />
        </td>
        <td className="px-3 py-2">
          <input
            value={form.description || ''}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder={t('description')}
            aria-label={t('description')}
            className={inputCls}
          />
        </td>
        <td className="px-3 py-2">
          <select value={form.autoImportance} onChange={(e) => setForm({ ...form, autoImportance: e.target.value })} aria-label="Importance" className={selectCls}>
            <option value="Alta">{t('high')}</option>
            <option value="Media">{t('medium')}</option>
            <option value="Baja">{t('low')}</option>
          </select>
        </td>
        <td className="px-3 py-2">
          <div className="flex flex-col gap-1">
            <label className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] cursor-pointer">
              <input type="checkbox" checked={form.autoAuthorize} onChange={(e) => setForm({ ...form, autoAuthorize: e.target.checked })} className="rounded border-[var(--border-default)] text-[var(--status-advisory)] focus:ring-[var(--status-advisory)]" />
              {t('authorized')}
            </label>
            <label className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] cursor-pointer">
              <input type="checkbox" checked={form.autoCritical} onChange={(e) => setForm({ ...form, autoCritical: e.target.checked })} className="rounded border-[var(--border-default)] text-[var(--status-advisory)] focus:ring-[var(--status-advisory)]" />
              {t('critical')}
            </label>
          </div>
        </td>
        <td className="px-3 py-2">
          <div className="flex items-center gap-1">
            <button
              onClick={onSubmit}
              disabled={!form.pattern || createMutation.isPending || updateMutation.isPending}
              className="p-1 rounded text-[var(--status-normal)] hover:bg-[var(--status-normal-muted)] disabled:opacity-40 transition-colors"
            >
              <Check className="w-4 h-4" />
            </button>
            <button onClick={cancelEdit} className="p-1 rounded text-[var(--text-muted)] hover:bg-[var(--bg-inset)] transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <Card padding="none">
      <CardHeader className="px-4 pt-4">
        <CardTitle>{t('whitelist')}</CardTitle>
        <button
          onClick={() => { setShowForm(true); setEditingId(null); setForm({ ...EMPTY_FORM }); }}
          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[var(--status-advisory)] hover:bg-[var(--status-advisory-muted)] rounded transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          {t('addEntry')}
        </button>
      </CardHeader>
      <CardContent className="px-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <svg className="animate-spin h-5 w-5 text-[var(--status-normal)]" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-0">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-inset)]">
                  <th className="px-3 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">{t('type')}</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">{t('pattern')}</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">{t('description')}</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">{t('importance')}</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">{t('autoFlags')}</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {showForm && <FormRow onSubmit={handleCreate} submitLabel={t('addEntry')} />}
                {entries.map((entry) =>
                  editingId === entry.id ? (
                    <FormRow key={entry.id} onSubmit={handleUpdate} submitLabel={t('save')} />
                  ) : (
                    <tr key={entry.id} className={cn('hover:bg-[var(--bg-inset)] transition-colors', !entry.isActive && 'opacity-50')}>
                      <td className="px-3 py-2.5">
                        <span className="inline-flex px-1.5 py-0.5 text-xs font-readout rounded bg-[var(--bg-inset)] text-[var(--text-secondary)]">
                          {entry.entryType}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-sm font-readout text-[var(--text-primary)]">{entry.pattern}</td>
                      <td className="px-3 py-2.5 text-xs text-[var(--text-secondary)] max-w-[160px] truncate">{entry.description || '-'}</td>
                      <td className="px-3 py-2.5">
                        <span className={cn('inline-flex px-2 py-0.5 text-xs font-medium rounded-full', {
                          'bg-[var(--status-critical-muted)] text-[var(--status-critical)]': entry.autoImportance === 'Alta',
                          'bg-[var(--status-warning-muted)] text-[var(--status-warning)]': entry.autoImportance === 'Media',
                          'bg-[var(--bg-inset)] text-[var(--text-secondary)]': entry.autoImportance === 'Baja',
                        })}>
                          {entry.autoImportance}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex gap-2">
                          {entry.autoAuthorize && (
                            <span className="inline-flex px-1.5 py-0.5 text-[10px] font-medium rounded bg-[var(--status-normal-muted)] text-[var(--status-normal)]">
                              {t('authorized')}
                            </span>
                          )}
                          {entry.autoCritical && (
                            <span className="inline-flex px-1.5 py-0.5 text-[10px] font-medium rounded bg-[var(--status-critical-muted)] text-[var(--status-critical)]">
                              {t('critical')}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1">
                          <button onClick={() => startEdit(entry)} className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--status-advisory)] hover:bg-[var(--status-advisory-muted)] transition-colors">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deleteMutation.mutate(entry.id)}
                            disabled={deleteMutation.isPending}
                            className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--status-critical)] hover:bg-[var(--status-critical-muted)] transition-colors disabled:opacity-40"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                )}
                {entries.length === 0 && !showForm && (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-sm text-[var(--text-muted)]">
                      {t('noWhitelistEntries')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
