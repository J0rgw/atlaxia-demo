import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
  rounded?: 'sm' | 'md' | 'lg' | 'full' | 'none';
}

const ROUNDED: Record<NonNullable<SkeletonProps['rounded']>, string> = {
  none: '',
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  full: 'rounded-full',
};

/** Neutral placeholder used inside a card while data is loading. */
export function SkeletonBox({ className, rounded = 'md' }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse bg-[var(--bg-inset)] border border-[var(--border-subtle)]',
        ROUNDED[rounded],
        className,
      )}
    />
  );
}

/** Solid pulsing bar — drop-in for a single value, chart area, or row item. */
export function SkeletonBar({ className, rounded = 'sm' }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse bg-[var(--bg-inset)]',
        ROUNDED[rounded],
        className,
      )}
    />
  );
}

/** Short pulsing line sized like a text token. */
export function SkeletonText({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse h-3 w-24 rounded-sm bg-[var(--bg-inset)]',
        className,
      )}
    />
  );
}

export const Skeleton = {
  Box: SkeletonBox,
  Bar: SkeletonBar,
  Text: SkeletonText,
};
