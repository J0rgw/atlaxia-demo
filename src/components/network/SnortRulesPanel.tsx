import { useState } from 'react';
import { Plus, Trash2, RefreshCw, Download, ChevronDown, Power } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { useTranslation } from '@/stores/languageStore';
import {
  useSnortRules,
  useCreateSnortRule,
  useDeleteSnortRule,
  useToggleSnortRule,
  useSyncSnortRules,
  useImportSnortRules,
  useSnortTemplates,
  type SnortRuleCreate,
} from '@/hooks/useNetwork';

const PRIORITY_STYLES: Record<number, string> = {
  1: 'bg-[var(--status-critical-muted)] text-[var(--status-critical)]',
  2: 'bg-[var(--status-warning-muted)] text-[var(--status-warning)]',
  3: 'bg-[var(--status-advisory-muted)] text-[var(--status-advisory)]',
  4: 'bg-[var(--bg-inset)] text-[var(--text-secondary)]',
};

const EMPTY_RULE: SnortRuleCreate = {
  sid: 0,
  ruleText: '',
  name: '',
  category: '',
  isEnabled: true,
  isPassRule: false,
  priority: 3,
};

export function SnortRulesPanel() {
  const { t } = useTranslation();
  const { data, isLoading } = useSnortRules();
  const { data: templatesData } = useSnortTemplates();
  const createMutation = useCreateSnortRule();
  const deleteMutation = useDeleteSnortRule();
  const toggleMutation = useToggleSnortRule();
  const syncMutation = useSyncSnortRules();
  const importMutation = useImportSnortRules();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<SnortRuleCreate>({ ...EMPTY_RULE });
  const [showTemplates, setShowTemplates] = useState(false);

  const rules = data?.rules ?? [];
  const templates = templatesData?.templates ?? [];

  const handleCreate = () => {
    if (!form.sid || !form.ruleText || !form.name) return;
    createMutation.mutate(form, {
      onSuccess: () => {
        setShowForm(false);
        setForm({ ...EMPTY_RULE });
      },
    });
  };

  const applyTemplate = (template: string, category: string) => {
    setForm({ ...form, ruleText: template, category });
    setShowTemplates(false);
  };

  const inputCls =
    'w-full px-2 py-1 text-sm rounded border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] focus:ring-1 focus:ring-[var(--status-advisory)] focus:border-[var(--status-advisory)]';

  return (
    <Card padding="none">
      <CardHeader className="px-4 pt-4">
        <div className="flex items-center gap-2">
          <CardTitle>{t('snortRules')}</CardTitle>
          {data && (
            <span className="text-xs text-[var(--text-muted)]">
              {data.enabled}/{data.total} {t('enabled')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => importMutation.mutate()}
            disabled={importMutation.isPending}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-inset)] rounded transition-colors disabled:opacity-40"
          >
            <Download className="w-3 h-3" />
            {t('import')}
          </button>
          <button
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            className={cn(
              'inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded transition-colors disabled:opacity-40',
              syncMutation.isSuccess
                ? 'text-[var(--status-normal)] bg-[var(--status-normal-muted)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-inset)]'
            )}
          >
            <RefreshCw className={cn('w-3 h-3', syncMutation.isPending && 'animate-spin')} />
            {t('sync')}
          </button>
          <button
            onClick={() => { setShowForm(true); setForm({ ...EMPTY_RULE }); }}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[var(--status-advisory)] hover:bg-[var(--status-advisory-muted)] rounded transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            {t('addRule')}
          </button>
        </div>
      </CardHeader>
      <CardContent className="px-0">
        {/* Create form */}
        {showForm && (
          <div className="px-4 py-3 border-b border-[var(--border-subtle)] bg-[var(--status-advisory-muted)] space-y-2">
            <div className="grid grid-cols-[80px_1fr_1fr_100px_80px] gap-2">
              <input
                type="number"
                value={form.sid || ''}
                onChange={(e) => setForm({ ...form, sid: parseInt(e.target.value) || 0 })}
                placeholder="SID"
                aria-label="SID"
                className={inputCls}
              />
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={t('name')}
                aria-label={t('name')}
                className={inputCls}
              />
              <input
                value={form.category || ''}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder={t('category')}
                aria-label={t('category')}
                className={inputCls}
              />
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) })}
                aria-label="Priority"
                className={inputCls}
              >
                <option value={1}>P1</option>
                <option value={2}>P2</option>
                <option value={3}>P3</option>
                <option value={4}>P4</option>
              </select>
              <label className="flex items-center gap-1 text-xs text-[var(--text-secondary)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isPassRule}
                  onChange={(e) => setForm({ ...form, isPassRule: e.target.checked })}
                  className="rounded border-[var(--border-default)] text-[var(--status-advisory)] focus:ring-[var(--status-advisory)]"
                />
                Pass
              </label>
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  value={form.ruleText}
                  onChange={(e) => setForm({ ...form, ruleText: e.target.value })}
                  placeholder={t('ruleText')}
                  aria-label={t('ruleText')}
                  className={cn(inputCls, 'font-readout text-xs')}
                />
              </div>
              <div className="relative">
                <button
                  onClick={() => setShowTemplates(!showTemplates)}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-inset)] rounded border border-[var(--border-default)] transition-colors"
                >
                  {t('templates')}
                  <ChevronDown className="w-3 h-3" />
                </button>
                {showTemplates && (
                  <div className="absolute right-0 top-full mt-1 z-10 w-72 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg py-1">
                    {templates.map((tpl, i) => (
                      <button
                        key={i}
                        onClick={() => applyTemplate(tpl.template, tpl.category)}
                        className="w-full text-left px-3 py-1.5 text-xs hover:bg-[var(--bg-inset)] transition-colors"
                      >
                        <span className="font-medium text-[var(--text-primary)]">{tpl.name}</span>
                        <span className="ml-2 text-[var(--text-muted)]">{tpl.category}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-1">
              <button onClick={() => setShowForm(false)} className="px-3 py-1 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-inset)] rounded transition-colors">
                {t('cancel')}
              </button>
              <button
                onClick={handleCreate}
                disabled={!form.sid || !form.ruleText || !form.name || createMutation.isPending}
                className="px-3 py-1 text-xs font-medium text-white bg-[var(--status-advisory)] hover:opacity-90 rounded transition-colors disabled:opacity-40"
              >
                {t('addRule')}
              </button>
            </div>
          </div>
        )}

        {/* Rules table */}
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
                  <th className="px-3 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider w-16">SID</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">{t('name')}</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">{t('category')}</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider w-12">P</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider w-16">{t('status')}</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider w-16">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {rules.map((rule) => (
                  <tr key={rule.id} className={cn('hover:bg-[var(--bg-inset)] transition-colors', !rule.isEnabled && 'opacity-50')}>
                    <td className="px-3 py-2 text-xs font-readout text-[var(--text-secondary)]">{rule.sid}</td>
                    <td className="px-3 py-2">
                      <div className="text-sm text-[var(--text-primary)] truncate max-w-[240px]">{rule.name}</div>
                      {rule.isPassRule && (
                        <span className="text-[10px] font-medium text-[var(--status-normal)]">PASS</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs text-[var(--text-secondary)]">{rule.category || '-'}</td>
                    <td className="px-3 py-2">
                      <span className={cn('inline-flex w-6 h-5 items-center justify-center text-[10px] font-bold rounded', PRIORITY_STYLES[rule.priority] || PRIORITY_STYLES[3])}>
                        {rule.priority}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => toggleMutation.mutate(rule.id)}
                        disabled={toggleMutation.isPending}
                        className={cn(
                          'p-1 rounded transition-colors',
                          rule.isEnabled
                            ? 'text-[var(--status-normal)] hover:bg-[var(--status-normal-muted)]'
                            : 'text-[var(--text-muted)] hover:bg-[var(--bg-inset)]'
                        )}
                        title={rule.isEnabled ? t('enabled') : t('disabled')}
                      >
                        <Power className="w-3.5 h-3.5" />
                      </button>
                    </td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => deleteMutation.mutate(rule.id)}
                        disabled={deleteMutation.isPending}
                        className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--status-critical)] hover:bg-[var(--status-critical-muted)] transition-colors disabled:opacity-40"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
                {rules.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-sm text-[var(--text-muted)]">
                      {t('noSnortRules')}
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
