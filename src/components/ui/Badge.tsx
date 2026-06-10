import { type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-none text-xs font-medium font-readout',
        {
          'bg-[var(--bg-inset)] text-[var(--text-secondary)]': variant === 'default',
          'bg-[var(--status-normal-muted)] text-[var(--status-normal)]': variant === 'success',
          'bg-[var(--status-warning-muted)] text-[var(--status-warning)]': variant === 'warning',
          'bg-[var(--status-critical-muted)] text-[var(--status-critical)]': variant === 'error',
          'bg-[var(--status-advisory-muted)] text-[var(--status-advisory)]': variant === 'info',
        },
        className
      )}
      {...props}
    />
  );
}

export { Badge };
