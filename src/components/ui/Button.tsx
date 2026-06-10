import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center font-medium rounded-sm text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/25 disabled:opacity-50 disabled:cursor-not-allowed',
          {
            'bg-[var(--accent-primary)] text-white hover:brightness-110':
              variant === 'primary',
            'bg-transparent border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-inset)]':
              variant === 'secondary',
            'bg-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-inset)]':
              variant === 'ghost',
            'bg-transparent border border-[var(--status-critical)]/40 text-[var(--status-critical)] hover:bg-[var(--status-critical-muted)]':
              variant === 'danger',
          },
          {
            'h-7 px-3': size === 'sm',
            'h-8 px-4': size === 'md',
            'h-9 px-6': size === 'lg',
          },
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button };
