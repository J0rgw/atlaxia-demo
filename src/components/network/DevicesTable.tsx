import { cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useTranslation } from '@/stores/languageStore';
import type { NetworkDevice } from '@/types';

interface DevicesTableProps {
  devices: NetworkDevice[];
}

function StatusIndicator({ status }: { status: NetworkDevice['status'] }) {
  const { t } = useTranslation();

  return (
    <div className="flex gap-1">
      <span
        className={cn(
          'w-3 h-3 rounded-full',
          status.authorized ? 'bg-[var(--status-normal)]' : 'bg-[var(--status-critical)]'
        )}
        title={status.authorized ? t('authorized') : t('notAuthorized')}
      />
      <span
        className={cn(
          'w-3 h-3 rounded-full',
          status.critical ? 'bg-[var(--bg-base)]' : 'border-2 border-[var(--border-emphasis)] bg-transparent'
        )}
        title={status.critical ? t('critical') : t('notCritical')}
      />
      <span
        className={cn(
          'w-3 h-3 rounded-full',
          status.repairable ? 'bg-[var(--bg-base)]' : 'border-2 border-[var(--border-emphasis)] bg-transparent'
        )}
        title={status.repairable ? t('repairable') : t('notRepairable')}
      />
    </div>
  );
}

export function DevicesTable({ devices }: DevicesTableProps) {
  const { t } = useTranslation();

  return (
    <Card padding="none">
      <CardHeader className="px-4 pt-4">
        <CardTitle>{t('networkDevices')}</CardTitle>
      </CardHeader>
      <CardContent className="px-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-0">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-inset)]">
                <th className="px-3 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider whitespace-nowrap">
                  {t('status')}
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                  {t('name')}
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider whitespace-nowrap">
                  {t('type')}
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider whitespace-nowrap">
                  {t('mac')}
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider whitespace-nowrap">
                  {t('ip')}
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider whitespace-nowrap">
                  {t('importance')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {devices.map((device) => (
                <tr
                  key={device.id}
                  className={cn(
                    'hover:bg-[var(--bg-inset)] transition-colors',
                    !device.status.authorized && 'bg-[var(--status-critical-muted)]'
                  )}
                >
                  <td className="px-3 py-3">
                    <StatusIndicator status={device.status} />
                  </td>
                  <td className="px-3 py-3 text-sm font-medium text-[var(--text-primary)]">
                    {device.name}
                  </td>
                  <td className="px-3 py-3 text-sm text-[var(--text-secondary)]">
                    <Badge axis="device" value={device.type.toLowerCase() as 'plc' | 'scada' | 'pc' | 'switch' | 'router'} />
                  </td>
                  <td className="px-3 py-3 text-xs text-[var(--text-secondary)] font-readout">
                    {device.macAddress}
                  </td>
                  <td className="px-3 py-3 text-xs text-[var(--text-secondary)] font-readout">
                    {device.ipAddress}
                  </td>
                  <td className="px-3 py-3">
                    <Badge axis="importance" value={device.importance === 'Alta' ? 'alta' : device.importance === 'Media' ? 'media' : 'baja'} />
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
