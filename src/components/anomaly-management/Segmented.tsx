import { cn } from '@/lib/utils';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
}

/**
 * Control segmentado de rango temporal: track inset gris con la opción activa
 * elevada en una pastilla blanca (sombra suave). Estética compartida por todos
 * los filtros de tiempo de la app (overview, eventos, historial de alertas).
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: SegmentedProps<T>) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        'inline-flex items-center gap-0.5 rounded-lg bg-[var(--bg-inset)] p-1',
        className
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              'px-3 h-7 pointer-coarse:h-9 rounded-md text-xs font-medium whitespace-nowrap transition-all',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/40',
              active
                ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] font-semibold shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
