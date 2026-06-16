import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Check, ListFilter } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface HeaderFilterOption<T extends string> {
  value: T;
  label: string;
}

interface HeaderFilterProps<T extends string> {
  /** Texto de la columna / del chip. */
  label: string;
  options: HeaderFilterOption<T>[];
  value: T;
  /** Valor "sin filtrar" — con él el trigger se pinta neutro. */
  defaultValue: T;
  onChange: (value: T) => void;
  /** 'header': dentro de un th de tabla · 'chip': suelto en una toolbar. */
  variant?: 'header' | 'chip';
}

/**
 * Filtro de columna estilo data-grid: el header ES el control. Cuando hay un
 * filtro activo (≠ defaultValue) el trigger se tiñe de accent y muestra la
 * opción elegida.
 */
export function HeaderFilter<T extends string>({
  label,
  options,
  value,
  defaultValue,
  onChange,
  variant = 'header',
}: HeaderFilterProps<T>) {
  const active = value !== defaultValue;
  const current = options.find((o) => o.value === value);

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex items-center gap-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/40',
            variant === 'header'
              ? 'text-xs font-medium uppercase tracking-wider'
              : 'h-7 px-2.5 text-xs font-medium rounded-sm border border-[var(--border-subtle)] bg-[var(--bg-inset)]',
            active
              ? 'text-[var(--accent-primary)]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          )}
        >
          {label}
          {active && current && (
            <span className="font-readout normal-case tracking-normal">· {current.label}</span>
          )}
          <ListFilter className="w-3 h-3 shrink-0" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          sideOffset={5}
          align="start"
          className="min-w-[150px] bg-[var(--bg-surface-raised)] rounded-md border border-[var(--border-default)] p-1 z-dropdown shadow-card"
        >
          {options.map((opt) => (
            <DropdownMenu.Item
              key={opt.value}
              onSelect={() => onChange(opt.value)}
              className={cn(
                'flex items-center justify-between gap-3 px-2 py-1.5 text-xs rounded-sm cursor-pointer outline-none',
                'text-[var(--text-primary)] hover:bg-[var(--status-advisory-muted)] hover:text-[var(--accent-primary)]',
                opt.value === value && 'text-[var(--accent-primary)] font-semibold'
              )}
            >
              {opt.label}
              {opt.value === value && <Check className="w-3 h-3" />}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
