import { useState, useMemo } from 'react';
import { addMonths, subMonths } from 'date-fns';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { TooltipProvider } from '@/components/ui/Tooltip';
import { CalendarHeader } from './CalendarHeader';
import { CalendarDayCell } from './CalendarDayCell';
import { CalendarLegend } from './CalendarLegend';
import { aggregateEventsByDate, generateCalendarGrid } from '@/lib/calendarUtils';
import { useTranslation } from '@/stores/languageStore';
import type { AnomalyData, NetworkAlert, CalendarDayEvents } from '@/types';

interface CalendarGridProps {
  anomalies?: AnomalyData[];
  alerts?: NetworkAlert[];
  anomalyThreshold?: number;
  initialDate?: Date;
  onDayClick?: (date: Date, events: CalendarDayEvents | null) => void;
  onMonthChange?: (date: Date) => void;
  showLegend?: boolean;
}

const WEEKDAYS_ES = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const WEEKDAYS_EN = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export function CalendarGrid({
  anomalies = [],
  alerts = [],
  anomalyThreshold = 0.7,
  initialDate,
  onDayClick,
  onMonthChange,
  showLegend = true,
}: CalendarGridProps) {
  const [currentDate, setCurrentDate] = useState(initialDate || new Date());
  const { t, language } = useTranslation();

  const weekdays = language === 'es' ? WEEKDAYS_ES : WEEKDAYS_EN;

  // Aggregate events by date
  const eventsByDate = useMemo(
    () => aggregateEventsByDate(anomalies, alerts, anomalyThreshold),
    [anomalies, alerts, anomalyThreshold]
  );

  // Generate calendar grid
  const weeks = useMemo(
    () => generateCalendarGrid(currentDate, eventsByDate),
    [currentDate, eventsByDate]
  );

  const goToPreviousMonth = () => {
    const newDate = subMonths(currentDate, 1);
    setCurrentDate(newDate);
    onMonthChange?.(newDate);
  };

  const goToNextMonth = () => {
    const newDate = addMonths(currentDate, 1);
    setCurrentDate(newDate);
    onMonthChange?.(newDate);
  };

  return (
    <TooltipProvider delayDuration={200}>
      <Card className="h-full">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle>{t('calendar')}</CardTitle>
          </div>
          <CalendarHeader
            currentDate={currentDate}
            onPreviousMonth={goToPreviousMonth}
            onNextMonth={goToNextMonth}
          />
        </CardHeader>
        <CardContent>
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekdays.map((day, index) => (
              <div
                key={index}
                className="text-center text-xs font-medium text-[var(--text-secondary)] py-1"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="space-y-1">
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="grid grid-cols-7 gap-1">
                {week.map((day) => (
                  <CalendarDayCell
                    key={day.date.toISOString()}
                    day={day}
                    onClick={() => onDayClick?.(day.date, day.events)}
                  />
                ))}
              </div>
            ))}
          </div>

          {showLegend && <CalendarLegend />}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
