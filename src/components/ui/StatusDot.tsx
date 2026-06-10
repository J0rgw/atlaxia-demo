import { cn } from '@/lib/utils';

export interface StatusDotProps {
  status: 'success' | 'warning' | 'error' | 'info' | 'offline';
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
  className?: string;
}

function StatusDot({ status, size = 'md', pulse = false, className }: StatusDotProps) {
  return (
    <span
      className={cn(
        'inline-block rounded-full',
        {
          'w-2 h-2': size === 'sm',
          'w-2.5 h-2.5': size === 'md',
          'w-3 h-3': size === 'lg',
        },
        {
          'bg-[var(--status-normal)]': status === 'success',
          'bg-[var(--status-warning)]': status === 'warning',
          'bg-[var(--status-critical)]': status === 'error',
          'bg-[var(--status-advisory)]': status === 'info',
          'bg-[var(--text-muted)]': status === 'offline',
        },
        pulse && 'animate-pulse',
        className
      )}
    />
  );
}

export { StatusDot };
