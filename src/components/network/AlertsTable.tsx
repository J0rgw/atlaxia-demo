import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useTranslation } from '@/stores/languageStore';
import type { NetworkAlert } from '@/types';

interface AlertsTableProps {
  alerts: NetworkAlert[];
}

export function AlertsTable({ alerts }: AlertsTableProps) {
  const { t } = useTranslation();

  return (
    <Card padding="none">
      <CardHeader className="px-4 pt-4">
        <CardTitle>{t('networkAlerts')}</CardTitle>
      </CardHeader>
      <CardContent className="px-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-inset)]">
                <th className="px-2 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider whitespace-nowrap">
                  {t('type')}
                </th>
                <th className="px-2 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                  {t('name')}
                </th>
                <th className="px-2 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider whitespace-nowrap">
                  MAC Orig.
                </th>
                <th className="px-2 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider whitespace-nowrap">
                  MAC Dest.
                </th>
                <th className="px-2 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider whitespace-nowrap">
                  IP Orig.
                </th>
                <th className="px-2 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider whitespace-nowrap">
                  IP Dest.
                </th>
                <th className="px-2 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider whitespace-nowrap">
                  {t('date')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {alerts.map((alert) => (
                <tr key={alert.id} className="hover:bg-[var(--bg-inset)] transition-colors">
                  <td className="px-2 py-2">
                    <Badge axis="alert" value={alert.type === 'Emergencia' ? 'emergencia' : alert.type === 'Alerta' ? 'alerta' : 'aviso'} />
                  </td>
                  <td className="px-2 py-2 text-xs font-medium text-[var(--text-primary)] max-w-[120px] truncate">
                    {alert.name}
                  </td>
                  <td className="px-2 py-2 text-xs text-[var(--text-secondary)] font-readout">
                    {alert.macOrigin}
                  </td>
                  <td className="px-2 py-2 text-xs text-[var(--text-secondary)] font-readout">
                    {alert.macDestination}
                  </td>
                  <td className="px-2 py-2 text-xs text-[var(--text-secondary)] font-readout">
                    {alert.ipOrigin}
                  </td>
                  <td className="px-2 py-2 text-xs text-[var(--text-secondary)] font-readout">
                    {alert.ipDestination}
                  </td>
                  <td className="px-2 py-2 text-xs text-[var(--text-secondary)] whitespace-nowrap">
                    {alert.date}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
