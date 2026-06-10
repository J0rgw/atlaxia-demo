import { cn } from '@/lib/utils';

interface LiveIndicatorProps {
  isLive?: boolean;
  className?: string;
}

export function LiveIndicator({ isLive = true, className }: LiveIndicatorProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
        isLive
          ? 'bg-[var(--status-normal-muted)] text-[var(--status-normal)]'
          : 'bg-[var(--bg-inset)] text-[var(--text-secondary)]',
        className
      )}
    >
      <span
        className={cn(
          'w-2 h-2 rounded-full',
          isLive ? 'bg-[var(--status-normal)] animate-pulse' : 'bg-[var(--text-muted)]'
        )}
      />
      {isLive ? 'LIVE' : 'OFFLINE'}
    </span>
  );
}
