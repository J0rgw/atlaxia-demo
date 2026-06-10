import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { useTranslation } from '@/stores/languageStore';

interface CalendarHeaderProps {
  currentDate: Date;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
}

export function CalendarHeader({
  currentDate,
  onPreviousMonth,
  onNextMonth,
}: CalendarHeaderProps) {
  const { language } = useTranslation();
  const locale = language === 'es' ? es : enUS;

  const monthYear = format(currentDate, 'MMMM yyyy', { locale });
  const capitalizedMonthYear =
    monthYear.charAt(0).toUpperCase() + monthYear.slice(1);

  return (
    <div className="flex items-center justify-between">
      <button
        onClick={onPreviousMonth}
        className="p-1 rounded-md hover:bg-[var(--bg-inset)] transition-colors"
        aria-label={language === 'es' ? 'Mes anterior' : 'Previous month'}
      >
        <ChevronLeft className="w-5 h-5 text-[var(--text-secondary)]" />
      </button>
      <span className="text-sm font-medium text-[var(--text-primary)]">
        {capitalizedMonthYear}
      </span>
      <button
        onClick={onNextMonth}
        className="p-1 rounded-md hover:bg-[var(--bg-inset)] transition-colors"
        aria-label={language === 'es' ? 'Mes siguiente' : 'Next month'}
      >
        <ChevronRight className="w-5 h-5 text-[var(--text-secondary)]" />
      </button>
    </div>
  );
}
