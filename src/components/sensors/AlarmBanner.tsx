/**
 * AlarmBanner Component
 * ISA-18.2 compliant alarm banner showing active alarms with priority ordering
 */

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ALARM_PRIORITY_CONFIG } from '@/lib/statusStyles';
import type { ActiveAlarm, AlarmPriority, AlarmLevel } from '@/types/industrial';

interface AlarmBannerProps {
  alarms: ActiveAlarm[];
  onAlarmClick?: (alarm: ActiveAlarm) => void;
  onAcknowledge?: (sensorTag: string) => void;
  maxVisible?: number;
  className?: string;
}

const PRIORITY_CONFIG = ALARM_PRIORITY_CONFIG;

const LEVEL_LABELS: Record<AlarmLevel, string> = {
  HH: 'MUY ALTO',
  H: 'ALTO',
  L: 'BAJO',
  LL: 'MUY BAJO',
};

function AlarmItem({
  alarm,
  onClick,
  onAcknowledge,
}: {
  alarm: ActiveAlarm;
  onClick?: () => void;
  onAcknowledge?: () => void;
}) {
  const config = PRIORITY_CONFIG[alarm.priority];

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-2 rounded-lg border cursor-pointer transition-all',
        config.bgColor,
        config.textColor,
        config.borderColor,
        config.accentBorder,
        config.pulse && 'animate-pulse',
        alarm.acknowledged && 'opacity-60'
      )}
      onClick={onClick}
    >
      {/* Priority Icon */}
      <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-black/10 dark:bg-white/20 font-bold text-sm">
        {config.icon}
      </div>

      {/* Alarm Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm">{alarm.sensorTag}</span>
          <span className="text-xs opacity-60">|</span>
          <span className="text-xs font-medium">{LEVEL_LABELS[alarm.level]}</span>
          <span className="text-xs opacity-60">|</span>
          <span className="text-xs">{alarm.processArea}</span>
        </div>
        <p className="text-xs opacity-80 truncate">{alarm.description}</p>
      </div>

      {/* Value */}
      <div className="flex-shrink-0 text-right">
        <div className="font-readout font-bold text-lg">
          {alarm.value.toFixed(1)}
        </div>
        <div className="text-xs opacity-70">
          Limite: {alarm.limit}
        </div>
      </div>

      {/* Acknowledge Button */}
      {!alarm.acknowledged && onAcknowledge && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAcknowledge();
          }}
          className="flex-shrink-0 px-2 py-1 text-xs font-medium bg-black/10 dark:bg-white/20 hover:bg-black/20 dark:hover:bg-white/30 rounded transition-colors"
        >
          ACK
        </button>
      )}
    </div>
  );
}

function AlarmSummary({ alarms }: { alarms: ActiveAlarm[] }) {
  const counts = alarms.reduce(
    (acc, alarm) => {
      acc[alarm.priority] = (acc[alarm.priority] || 0) + 1;
      return acc;
    },
    {} as Record<AlarmPriority, number>
  );

  return (
    <div className="flex items-center gap-2">
      {counts.EMERGENCY && counts.EMERGENCY > 0 && (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-[var(--status-critical)] text-white animate-pulse">
          {counts.EMERGENCY} EMERGENCIA
        </span>
      )}
      {counts.HIGH && counts.HIGH > 0 && (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-[var(--status-warning)] text-white">
          {counts.HIGH} ALTA
        </span>
      )}
      {counts.MEDIUM && counts.MEDIUM > 0 && (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--status-warning)] text-white">
          {counts.MEDIUM} MEDIA
        </span>
      )}
      {counts.LOW && counts.LOW > 0 && (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--status-advisory)] text-white">
          {counts.LOW} BAJA
        </span>
      )}
    </div>
  );
}

export function AlarmBanner({
  alarms,
  onAlarmClick,
  onAcknowledge,
  maxVisible = 3,
  className,
}: AlarmBannerProps) {
  const [expanded, setExpanded] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Sort alarms by priority
  const sortedAlarms = [...alarms].sort((a, b) => {
    const priorityOrder: Record<AlarmPriority, number> = {
      EMERGENCY: 0,
      HIGH: 1,
      MEDIUM: 2,
      LOW: 3,
    };
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return b.timestamp - a.timestamp;
  });

  // Auto-rotate through alarms when collapsed
  useEffect(() => {
    if (sortedAlarms.length <= 1 || expanded) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % sortedAlarms.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [sortedAlarms.length, expanded]);

  if (sortedAlarms.length === 0) {
    return (
      <div
        className={cn(
          'bg-[var(--status-normal-muted)] border border-[var(--border-subtle)] rounded-lg p-3 transition-colors',
          className
        )}
      >
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[var(--status-normal)]" />
          <span className="text-[var(--status-normal)] font-medium text-sm">
            Sistema Normal - Sin Alarmas Activas
          </span>
        </div>
      </div>
    );
  }

  const visibleAlarms = expanded
    ? sortedAlarms
    : sortedAlarms.slice(0, maxVisible);

  const hasEmergency = sortedAlarms.some((a) => a.priority === 'EMERGENCY');

  return (
    <div
      className={cn(
        'rounded-lg border overflow-hidden transition-colors',
        'bg-[var(--bg-surface)]',
        hasEmergency
          ? 'border-[var(--status-critical)]'
          : 'border-[var(--status-warning)]',
        className
      )}
    >
      {/* Header */}
      <div
        className={cn(
          'flex items-center justify-between px-4 py-2 cursor-pointer transition-colors',
          'bg-[var(--bg-inset)]',
          hasEmergency ? 'border-l-4 border-l-[var(--status-critical)]' : 'border-l-4 border-l-[var(--status-warning)]'
        )}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'w-2.5 h-2.5 rounded-full',
              hasEmergency ? 'bg-[var(--status-critical)] animate-pulse' : 'bg-[var(--status-warning)]'
            )}
          />
          <span className="font-semibold text-sm text-[var(--text-primary)]">
            {sortedAlarms.length} Alarma{sortedAlarms.length !== 1 ? 's' : ''} Activa{sortedAlarms.length !== 1 ? 's' : ''}
          </span>
          <AlarmSummary alarms={sortedAlarms} />
        </div>

        <button
          className="text-xs font-medium px-2 py-1 rounded transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-inset)]"
        >
          {expanded ? 'Colapsar' : 'Ver Todas'}
        </button>
      </div>

      {/* Alarms List */}
      <div className="p-3 space-y-2 bg-[var(--bg-surface)]">
        {!expanded && sortedAlarms.length > maxVisible ? (
          <AlarmItem
            alarm={sortedAlarms[currentIndex]}
            onClick={() => onAlarmClick?.(sortedAlarms[currentIndex])}
            onAcknowledge={
              onAcknowledge
                ? () => onAcknowledge(sortedAlarms[currentIndex].sensorTag)
                : undefined
            }
          />
        ) : (
          visibleAlarms.map((alarm, index) => (
            <AlarmItem
              key={`${alarm.sensorTag}-${alarm.timestamp}-${index}`}
              alarm={alarm}
              onClick={() => onAlarmClick?.(alarm)}
              onAcknowledge={
                onAcknowledge ? () => onAcknowledge(alarm.sensorTag) : undefined
              }
            />
          ))
        )}
      </div>

      {/* Suggested Action for top alarm */}
      {sortedAlarms[0]?.suggestedAction && (
        <div
          className={cn(
            'px-4 py-2 text-xs border-t transition-colors',
            'bg-[var(--bg-inset)] border-[var(--border-subtle)] text-[var(--text-secondary)]'
          )}
        >
          <span className="font-semibold text-[var(--status-warning)]">Accion Sugerida: </span>
          {sortedAlarms[0].suggestedAction}
        </div>
      )}
    </div>
  );
}

export default AlarmBanner;
