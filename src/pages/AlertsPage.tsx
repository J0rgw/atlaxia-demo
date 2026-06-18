import { useState, useMemo } from 'react';
import { Search, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { useNetworkAlerts, useAcknowledgeAlert } from '@/hooks/useNetwork';
import { useTranslation } from '@/stores/languageStore';
import { AlertTimeline } from '@/components/network';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { Badge } from '@/components/ui/Badge';

const PAGE_SIZE = 25;

export function AlertsPage() {
  const { t } = useTranslation();

  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [alertType, setAlertType] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { data, isLoading, error } = useNetworkAlerts({
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
    alertType: alertType || undefined,
    search: search || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  });

  const acknowledgeMutation = useAcknowledgeAlert();

  const alerts = data?.alerts ?? [];
  const total = data?.total ?? 0;
  const byType = useMemo(() => data?.byType ?? { Emergencia: 0, Alerta: 0, Aviso: 0 }, [data?.byType]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(0);
  };

  const handleAcknowledge = (alertId: string) => {
    acknowledgeMutation.mutate(alertId);
  };

  const summaryCards = useMemo<{ label: 'Emergencia' | 'Alerta' | 'Aviso'; count: number }[]>(() => [
    { label: 'Emergencia', count: byType.Emergencia || 0 },
    { label: 'Alerta', count: byType.Alerta || 0 },
    { label: 'Aviso', count: byType.Aviso || 0 },
  ], [byType]);

  return (
    <div className="space-y-4">
      {/* Alert Timeline Chart */}
      <ErrorBoundary level="section">
        <AlertTimeline />
      </ErrorBoundary>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className="bg-[var(--bg-surface)] rounded-lg border border-[var(--border-subtle)] p-4 flex items-center gap-4"
          >
            <div>
              <p className="text-2xl font-bold text-[var(--text-primary)]">{card.count}</p>
              <Badge axis="alert" value={card.label === 'Emergencia' ? 'emergencia' : card.label === 'Alerta' ? 'alerta' : 'aviso'} />
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-[var(--bg-surface)] rounded-lg border border-[var(--border-subtle)] p-4">
        <div className="flex flex-wrap items-end gap-3">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <label htmlFor="alerts-search" className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              {t('searchAlerts')}
            </label>
            <div className="relative">
              <input
                id="alerts-search"
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder={t('searchAlerts')}
                className="w-full pl-8 pr-3 py-1.5 text-sm rounded-md border border-[var(--border-subtle)] bg-[var(--bg-inset)] text-[var(--text-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)]"
              />
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
            </div>
          </div>

          {/* Type filter */}
          <div className="min-w-[140px]">
            <label htmlFor="alerts-type-filter" className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              {t('filterByType')}
            </label>
            <select
              id="alerts-type-filter"
              value={alertType}
              onChange={(e) => { setAlertType(e.target.value); setPage(0); }}
              className="w-full px-3 py-1.5 text-sm rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)]"
            >
              <option value="">{t('allTypes')}</option>
              <option value="Emergencia">Emergencia</option>
              <option value="Alerta">Alerta</option>
              <option value="Aviso">Aviso</option>
            </select>
          </div>

          {/* Date from */}
          <div className="min-w-[160px]">
            <label htmlFor="alerts-date-from" className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              {t('dateFrom')}
            </label>
            <input
              id="alerts-date-from"
              type="datetime-local"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(0); }}
              className="w-full px-3 py-1.5 text-sm rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)]"
            />
          </div>

          {/* Date to */}
          <div className="min-w-[160px]">
            <label htmlFor="alerts-date-to" className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              {t('dateTo')}
            </label>
            <input
              id="alerts-date-to"
              type="datetime-local"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(0); }}
              className="w-full px-3 py-1.5 text-sm rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)]"
            />
          </div>

          <button
            onClick={handleSearch}
            className="px-4 py-1.5 text-sm font-medium text-white bg-[var(--accent-primary)] hover:opacity-90 rounded-md transition-colors"
          >
            {t('applyFilters')}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[var(--bg-surface)] rounded-lg border border-[var(--border-subtle)] overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <svg className="animate-spin h-6 w-6 text-[var(--accent-primary)]" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-[var(--status-critical)]">Error loading alerts</p>
          </div>
        ) : alerts.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-[var(--text-secondary)]">{t('noAlertsFound')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]/50">
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                    {t('type')}
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                    {t('name')}
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider whitespace-nowrap">
                    {t('macOrigin')}
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider whitespace-nowrap">
                    {t('ipOrigin')}
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider whitespace-nowrap">
                    {t('ipDestination')}
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                    {t('date')}
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                    {t('actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {alerts.map((alert) => (
                  <tr key={alert.id} className="hover:bg-[var(--bg-inset)] transition-colors">
                    <td className="px-3 py-2.5">
                      <Badge axis="alert" value={alert.type === 'Emergencia' ? 'emergencia' : alert.type === 'Alerta' ? 'alerta' : 'aviso'} />
                    </td>
                    <td className="px-3 py-2.5 text-sm text-[var(--text-primary)] max-w-[200px] truncate">
                      {alert.name}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-[var(--text-secondary)] font-readout">
                      {alert.macOrigin || '-'}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-[var(--text-secondary)] font-readout">
                      {alert.ipOrigin || '-'}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-[var(--text-secondary)] font-readout">
                      {alert.ipDestination || '-'}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-[var(--text-secondary)] whitespace-nowrap">
                      {alert.date}
                    </td>
                    <td className="px-3 py-2.5">
                      {alert.acknowledged ? (
                        <span className="inline-flex items-center gap-1 text-xs text-[var(--status-normal)]">
                          <Check className="w-3.5 h-3.5" />
                          {t('acknowledged')}
                        </span>
                      ) : (
                        <button
                          onClick={() => handleAcknowledge(alert.id)}
                          disabled={acknowledgeMutation.isPending}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-[var(--status-advisory)] hover:bg-[var(--status-advisory-muted)] rounded transition-colors disabled:opacity-50"
                        >
                          <Check className="w-3.5 h-3.5" />
                          {t('acknowledge')}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {total > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border-subtle)]">
            <p className="text-xs text-[var(--text-secondary)]">
              {t('showing')} {page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, total)} {t('of')} {total}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="p-1.5 rounded hover:bg-[var(--bg-inset)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-[var(--text-secondary)]" />
              </button>
              <span className="text-xs text-[var(--text-secondary)] px-2">
                {page + 1} / {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page >= totalPages - 1}
                className="p-1.5 rounded hover:bg-[var(--bg-inset)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4 text-[var(--text-secondary)]" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
