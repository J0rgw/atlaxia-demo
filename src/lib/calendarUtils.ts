import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  format,
} from 'date-fns';
import type {
  AnomalyData,
  NetworkAlert,
  CalendarDayData,
  CalendarDayEvents,
  CalendarEventSeverity,
} from '@/types';

const ANOMALY_THRESHOLD = 0.7;

export function getDateKey(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

function createEmptyDayEvents(date: Date, dateKey: string): CalendarDayEvents {
  return {
    date,
    dateKey,
    anomalyCount: 0,
    maxAnomalyScore: 0,
    emergencyCount: 0,
    alertCount: 0,
    avisoCount: 0,
    events: [],
  };
}

function getAnomalySeverity(score: number): CalendarEventSeverity {
  if (score >= 0.9) return 'critical';
  if (score >= 0.8) return 'high';
  if (score >= 0.7) return 'medium';
  return 'low';
}

export function aggregateEventsByDate(
  anomalies: AnomalyData[],
  alerts: NetworkAlert[],
  threshold: number = ANOMALY_THRESHOLD
): Map<string, CalendarDayEvents> {
  const eventMap = new Map<string, CalendarDayEvents>();

  // Process anomalies (those above threshold)
  anomalies
    .filter((a) => a.anomalyIndicator >= threshold && a.timestamp)
    .forEach((anomaly) => {
      const date = new Date(anomaly.timestamp!);
      const key = getDateKey(date);

      if (!eventMap.has(key)) {
        eventMap.set(key, createEmptyDayEvents(date, key));
      }

      const dayEvents = eventMap.get(key)!;
      dayEvents.anomalyCount++;
      dayEvents.maxAnomalyScore = Math.max(
        dayEvents.maxAnomalyScore,
        anomaly.anomalyIndicator
      );
      dayEvents.events.push({
        id: anomaly.sensorKey,
        type: 'anomaly',
        name: anomaly.sensorName,
        severity: getAnomalySeverity(anomaly.anomalyIndicator),
        timestamp: anomaly.timestamp!,
        source: anomaly.sensorKey,
      });
    });

  // Process alerts
  alerts.forEach((alert) => {
    const date = new Date(alert.timestamp);
    const key = getDateKey(date);

    if (!eventMap.has(key)) {
      eventMap.set(key, createEmptyDayEvents(date, key));
    }

    const dayEvents = eventMap.get(key)!;

    if (alert.type === 'Emergencia') {
      dayEvents.emergencyCount++;
    } else if (alert.type === 'Alerta') {
      dayEvents.alertCount++;
    } else {
      dayEvents.avisoCount++;
    }

    const eventType =
      alert.type === 'Emergencia'
        ? 'emergency'
        : alert.type === 'Alerta'
          ? 'alert'
          : 'aviso';

    const severity: CalendarEventSeverity =
      alert.type === 'Emergencia'
        ? 'high'
        : alert.type === 'Alerta'
          ? 'medium'
          : 'low';

    dayEvents.events.push({
      id: alert.id,
      type: eventType,
      name: alert.name,
      severity,
      timestamp: alert.timestamp,
    });
  });

  return eventMap;
}

export function generateCalendarGrid(
  currentDate: Date,
  eventsByDate: Map<string, CalendarDayEvents>
): CalendarDayData[][] {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const allDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const weeks: CalendarDayData[][] = [];
  let currentWeek: CalendarDayData[] = [];

  allDays.forEach((date) => {
    const dateKey = getDateKey(date);

    currentWeek.push({
      date,
      dayOfMonth: date.getDate(),
      isCurrentMonth: isSameMonth(date, currentDate),
      isToday: isToday(date),
      events: eventsByDate.get(dateKey) || null,
    });

    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });

  return weeks;
}

// Hover keeps the same status background but dims the lightness so contrast
// with the foreground text stays legible. Older versions relied on transform
// + shadow, which left `text-white` cells washed out on hover. The ring
// gives a visible focus affordance without altering color.
const HOVER_CONTRAST = 'hover:brightness-90 hover:ring-1 hover:ring-[var(--border-emphasis)]';

export function getBackgroundClass(events: CalendarDayEvents | null): string {
  if (!events) {
    return `bg-[var(--bg-inset)] ${HOVER_CONTRAST}`;
  }

  // Emergency takes priority
  if (events.emergencyCount > 0) {
    if (events.emergencyCount >= 4) {
      return `bg-[var(--status-emergency)] text-white ${HOVER_CONTRAST}`;
    }
    if (events.emergencyCount >= 2) {
      return `bg-[var(--status-critical)] text-white ${HOVER_CONTRAST}`;
    }
    return `bg-[var(--status-critical-muted)] ${HOVER_CONTRAST}`;
  }

  // Anomaly background
  if (events.anomalyCount > 0) {
    if (events.maxAnomalyScore >= 0.9) {
      return `bg-[var(--status-warning)] text-white ${HOVER_CONTRAST}`;
    }
    return `bg-[var(--status-warning-muted)] ${HOVER_CONTRAST}`;
  }

  // Alerts only (not emergencies)
  if (events.alertCount > 0) {
    return `bg-[var(--status-advisory-muted)] ${HOVER_CONTRAST}`;
  }

  return `bg-[var(--bg-inset)] ${HOVER_CONTRAST}`;
}
