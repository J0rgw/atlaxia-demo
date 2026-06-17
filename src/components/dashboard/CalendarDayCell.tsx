import { cn } from '@/lib/utils';
import { getBackgroundClass, getDateKey } from '@/lib/calendarUtils';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/Tooltip';
import { useTranslation } from '@/stores/languageStore';
import type { CalendarDayData } from '@/types';

interface CalendarDayCellProps {
  day: CalendarDayData;
  onClick?: () => void;
}

export function CalendarDayCell({ day, onClick }: CalendarDayCellProps) {
  const { t } = useTranslation();
  const hasEvents = day.events !== null;
  const hasEmergency = hasEvents && day.events!.emergencyCount > 0;
  const hasAnomaly = hasEvents && day.events!.anomalyCount > 0;
  const hasAlert = hasEvents && day.events!.alertCount > 0;

  const cellClasses = cn(
    // Base styles
    'relative w-full aspect-square rounded-lg flex items-center justify-center text-sm font-medium',
    'transition-colors cursor-pointer',
    // Month visibility
    day.isCurrentMonth ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]',
    // Today indicator - teal ring
    day.isToday && 'ring-2 ring-primary-500 ring-offset-1',
    // Event-based backgrounds (already includes hover affordances that preserve contrast).
    getBackgroundClass(day.events),
  );

  const tooltipContent = day.events ? (
    <div className="space-y-1 max-w-xs">
      <div className="font-medium">
        {day.dayOfMonth}/{day.date.getMonth() + 1}/{day.date.getFullYear()}
      </div>
      {day.events.emergencyCount > 0 && (
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[var(--status-critical)]" />
          <span>{day.events.emergencyCount} {t('emergencyCount')}</span>
        </div>
      )}
      {day.events.anomalyCount > 0 && (
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[var(--status-warning)]" />
          <span>
            {day.events.anomalyCount} {t('anomalyCount')} - {t('max')}:{' '}
            {(day.events.maxAnomalyScore * 100).toFixed(0)}%
          </span>
        </div>
      )}
      {day.events.alertCount > 0 && (
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[var(--status-advisory)]" />
          <span>{day.events.alertCount} {t('alertCount')}</span>
        </div>
      )}
      {day.events.avisoCount > 0 && (
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[var(--status-normal)]" />
          <span>{day.events.avisoCount} {t('noticeCount')}</span>
        </div>
      )}
    </div>
  ) : null;

  const cell = (
    <button
      className={cellClasses}
      onClick={onClick}
      data-cal-cell={getDateKey(day.date)}
    >
      {day.dayOfMonth}
      {/* Mini event dots */}
      {hasEvents && (
        <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex gap-0.5">
          {hasEmergency && (
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--status-critical)] border border-white" />
          )}
          {hasAnomaly && (
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--status-warning)] border border-white" />
          )}
          {hasAlert && !hasEmergency && !hasAnomaly && (
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--status-advisory)] border border-white" />
          )}
        </div>
      )}
    </button>
  );

  if (hasEvents) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{cell}</TooltipTrigger>
        <TooltipContent side="top">{tooltipContent}</TooltipContent>
      </Tooltip>
    );
  }

  return cell;
}
