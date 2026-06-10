import { Gauge, Box, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/Skeleton';
import type { KPIData } from '@/types';
import { useTranslation, type TranslationKey } from '@/stores/languageStore';

const iconMap = {
  efficiency: Gauge,
  units: Box,
  alerts: AlertTriangle,
};

interface KPICardProps {
  data: KPIData;
}

const statusBorderMap: Record<KPIData['variant'], string> = {
  teal: 'border-l-[3px] border-l-[var(--status-normal)]',
  green: 'border-l-[3px] border-l-[var(--status-normal)]',
  sky: 'border-l-[3px] border-l-[var(--status-advisory)]',
  neutral: 'border-l-[3px] border-l-[var(--border-default)]',
  warning: 'border-l-[3px] border-l-[var(--status-warning)]',
  critical: 'border-l-[3px] border-l-[var(--status-critical)]',
};

const iconBgMap: Record<KPIData['variant'], string> = {
  teal: 'text-[var(--status-normal)]',
  green: 'text-[var(--status-normal)]',
  sky: 'text-[var(--status-advisory)]',
  neutral: 'text-[var(--text-muted)]',
  warning: 'text-[var(--status-warning)]',
  critical: 'text-[var(--status-critical)]',
};

// Fixed height keeps the strip stable across variants. The criticality card's
// secondary line was the historical reflow culprit — splitting value and
// valueSecondary into reserved rows means a long level_name truncates instead
// of pushing the card taller.
const CARD_HEIGHT_CLASS = 'min-h-[104px]';

function KPICardShell({
  variant,
  children,
}: {
  variant: KPIData['variant'];
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'bg-[var(--bg-surface)] rounded-md border border-[var(--border-subtle)]',
        'px-4 py-3.5 relative overflow-hidden transition-colors',
        CARD_HEIGHT_CLASS,
        statusBorderMap[variant],
      )}
    >
      {children}
    </div>
  );
}

export function KPICard({ data }: KPICardProps) {
  const { t } = useTranslation();
  const Icon = iconMap[data.icon];

  if (data.loading) {
    return (
      <KPICardShell variant="neutral">
        <div className="flex items-start gap-3">
          <Skeleton.Bar className="w-4 h-4 mt-0.5" rounded="sm" />
          <div className="flex-1 space-y-2">
            <Skeleton.Bar className="h-3 w-24" />
            <Skeleton.Bar className="h-6 w-20" />
            <Skeleton.Bar className="h-3 w-28" />
          </div>
        </div>
      </KPICardShell>
    );
  }

  const title = data.titleKey ? t(data.titleKey as TranslationKey) : data.title;
  const subtitle = data.subtitleKey ? t(data.subtitleKey as TranslationKey) : data.subtitle;
  const valueSecondary = data.valueSecondaryKey
    ? t(data.valueSecondaryKey as TranslationKey)
    : data.valueSecondary;
  const trendValue = data.trend?.valueKey ? t(data.trend.valueKey as TranslationKey) : data.trend?.value;

  return (
    <KPICardShell variant={data.variant}>
      <div className="flex items-start gap-3 h-full">
        <div className={cn('shrink-0 mt-0.5', iconBgMap[data.variant])}>
          <Icon className="w-4 h-4" strokeWidth={2.5} />
        </div>
        <div className="flex-1 min-w-0 flex flex-col gap-0.5">
          <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider truncate">
            {title}
          </p>
          <p
            className="font-readout text-2xl font-bold text-[var(--text-primary)] leading-tight truncate"
            title={data.value}
          >
            {data.value}
          </p>
          {valueSecondary ? (
            <p
              className={cn(
                'text-[11px] uppercase tracking-wider font-semibold truncate',
                iconBgMap[data.variant],
              )}
              title={valueSecondary}
            >
              {valueSecondary}
            </p>
          ) : (
            // Reserve the row regardless to keep card height stable across
            // KPIs that omit a secondary line.
            <span className="text-[11px] leading-none">&nbsp;</span>
          )}
          {subtitle && (
            <p className="text-xs text-[var(--text-secondary)] truncate">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {data.trend && (
        <div className="flex items-center gap-1 mt-2 pt-2 border-t border-[var(--border-subtle)]">
          {data.trend.direction === 'up' ? (
            <TrendingUp className="w-3.5 h-3.5 text-[var(--status-normal)]" />
          ) : (
            <TrendingDown className="w-3.5 h-3.5 text-[var(--status-critical)]" />
          )}
          <span className="text-xs text-[var(--text-secondary)]">{trendValue}</span>
        </div>
      )}
    </KPICardShell>
  );
}
