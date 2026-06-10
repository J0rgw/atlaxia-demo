/**
 * AlarmStripe — slim full-width alarm summary strip.
 *
 * Replaces the 320px left-column AlarmBanner with a horizontal stripe
 * positioned between the ProcessStrip's legend and the cards/charts grid.
 *
 * States:
 *   - No alarms: single 32px-tall row with a green dot and a nominal
 *     status message. Stays out of the way.
 *   - Alarms active: expands inline to show severity-framed chips in
 *     priority order (EMERGENCY > HIGH > MEDIUM > LOW). Click a chip to
 *     jump to that sensor; the stripe's left edge is framed in the
 *     highest active priority's color so the operator's eye lands on
 *     severity before content.
 */

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { ALARM_PRIORITY_CONFIG } from '@/lib/statusStyles';
import type { ActiveAlarm, AlarmLevel, AlarmPriority } from '@/types/industrial';

interface AlarmStripeProps {
  alarms: ActiveAlarm[];
  onAlarmClick?: (alarm: ActiveAlarm) => void;
  className?: string;
}

const LEVEL_LABEL: Record<AlarmLevel, string> = {
  HH: 'HH', H: 'H', L: 'L', LL: 'LL',
};

const PRIORITY_RANK: Record<AlarmPriority, number> = {
  EMERGENCY: 0, HIGH: 1, MEDIUM: 2, LOW: 3,
};

function AlarmChip({ alarm, onClick }: { alarm: ActiveAlarm; onClick?: () => void }) {
  const cfg = ALARM_PRIORITY_CONFIG[alarm.priority];
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex items-center gap-2 shrink-0 rounded-md border pl-2 pr-3 py-1.5 text-xs transition-colors',
        cfg.bgColor,
        cfg.borderColor,
        cfg.accentBorder,
        cfg.textColor,
        cfg.pulse && 'animate-pulse',
        alarm.acknowledged && 'opacity-60',
      )}
    >
      <span className="font-bold tabular-nums">{LEVEL_LABEL[alarm.level]}</span>
      <span className="font-bold">{alarm.sensorTag}</span>
      <span className="opacity-70 hidden md:inline">{alarm.processArea}</span>
      <span className="font-readout font-bold tabular-nums">
        {alarm.value.toFixed(1)}
      </span>
    </button>
  );
}

export function AlarmStripe({ alarms, onAlarmClick, className }: AlarmStripeProps) {
  const sorted = useMemo(() => {
    return [...alarms].sort((a, b) => {
      const d = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
      return d !== 0 ? d : b.timestamp - a.timestamp;
    });
  }, [alarms]);

  if (sorted.length === 0) {
    return (
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)]',
          className,
        )}
      >
        <span className="w-2 h-2 rounded-full bg-[var(--status-normal)]" />
        <span className="text-xs text-[var(--text-secondary)]">
          Sistema operativo nominal
        </span>
      </div>
    );
  }

  // Frame the stripe's left edge in the highest-priority color so severity
  // is read before content.
  const topPriority = sorted[0].priority;
  const edgeBorder =
    topPriority === 'EMERGENCY' ? 'border-l-[6px] border-l-[var(--status-emergency)]' :
    topPriority === 'HIGH'      ? 'border-l-[5px] border-l-[var(--status-critical)]'  :
    topPriority === 'MEDIUM'    ? 'border-l-4 border-l-[var(--status-warning)]'       :
                                  'border-l-[3px] border-l-[var(--status-advisory)]';

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-x-auto',
        edgeBorder,
        className,
      )}
    >
      <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
        {sorted.length} {sorted.length === 1 ? 'alarma' : 'alarmas'}
      </span>
      <div className="flex items-center gap-2 min-w-max">
        {sorted.map((alarm, i) => (
          <AlarmChip
            key={`${alarm.sensorTag}-${alarm.timestamp}-${i}`}
            alarm={alarm}
            onClick={() => onAlarmClick?.(alarm)}
          />
        ))}
      </div>
    </div>
  );
}

export default AlarmStripe;
