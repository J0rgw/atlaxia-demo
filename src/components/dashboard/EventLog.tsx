import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/Card';
import { StatusDot } from '@/components/ui/StatusDot';
import { Badge } from '@/components/ui/Badge';
import { useTranslation } from '@/stores/languageStore';
import type { EventLog as EventLogType } from '@/types';
import type { ValueOf } from '@/lib/badges';

/** Network-alert type (Spanish label) -> the `alert` axis registry value. */
const ALERT_BADGE_VALUE: Record<
  NonNullable<EventLogType['alertType']>,
  ValueOf<'alert'>
> = {
  Emergencia: 'emergencia',
  Alerta: 'alerta',
  Aviso: 'aviso',
};

interface EventLogProps {
  events: EventLogType[];
}

export function EventLog({ events }: EventLogProps) {
  const { t } = useTranslation();

  return (
    <Card padding="none" className="h-full flex flex-col">
      <div className="px-4 pt-3 pb-2 border-b border-[var(--border-subtle)]/40">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wide">
          {t('recentApiLogs')}
        </h3>
      </div>
      <CardContent className="flex-1 overflow-auto">
        <div className="divide-y divide-[var(--border-subtle)]">
          {events.map((event) => (
            <div
              key={event.id}
              className="flex items-center justify-between px-4 py-2.5 hover:bg-[var(--bg-inset)]/60 dark:hover:bg-[var(--bg-inset)]/20 transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <StatusDot
                  status={event.status === 'success' ? 'success' : 'error'}
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                    {event.name}
                  </p>
                  <p className="text-[10px] font-readout text-[var(--text-muted)]">
                    {event.timestamp}
                  </p>
                </div>
              </div>
              {event.alertType ? (
                <span className="shrink-0 ml-2">
                  <Badge axis="alert" value={ALERT_BADGE_VALUE[event.alertType]} />
                </span>
              ) : event.criticality ? (
                <span className="shrink-0 ml-2">
                  <Badge axis="criticality" value={event.criticality} />
                </span>
              ) : (
                <span
                  className={cn(
                    'text-xs font-medium font-readout shrink-0 ml-2 px-1.5 py-0.5 rounded',
                    event.status === 'success'
                      ? 'text-[var(--status-normal)] bg-[var(--status-normal-muted)]'
                      : 'text-[var(--status-critical)] bg-[var(--status-critical-muted)]'
                  )}
                >
                  {event.statusText || (event.status === 'success' ? t('success') : t('error'))}
                </span>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
