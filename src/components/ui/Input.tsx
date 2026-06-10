import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', error, ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        className={cn(
          'w-full h-8 px-3 text-sm bg-[var(--bg-inset)] border border-[var(--border-default)] rounded-sm',
          'text-[var(--text-primary)]',
          'placeholder:text-[var(--text-muted)]',
          'focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/25 focus:border-[var(--accent-primary)]',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'transition-colors',
          error && 'border-[var(--status-critical)] focus:ring-[var(--status-critical)]',
          className
        )}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';

export { Input };
