import { useState } from 'react';
import { ChevronDown, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Renderiza un párrafo de narrativa con énfasis `**negrita**` → <b>. */
export function FluviaProse({ text, className }: { text: string; className?: string }) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return (
    <p className={className}>
      {parts.map((part, i) => (i % 2 === 1 ? <b key={i}>{part}</b> : part))}
    </p>
  );
}

interface FluviaBoxProps {
  /** Etiqueta junto al nombre (p. ej. "· Resumen del periodo"). */
  context: string;
  children: React.ReactNode;
  className?: string;
  /** Contenido extra alineado a la derecha de la cabecera (badges, ventana). */
  headerExtra?: React.ReactNode;
  /** 'md' agranda la prosa (hero del resumen); 'sm' es el tamaño compacto. */
  size?: 'sm' | 'md';
  /** Si es colapsable, la cabecera pliega/despliega el cuerpo. */
  collapsible?: boolean;
  defaultOpen?: boolean;
}

/**
 * Chrome de FluvIA reutilizable (misma identidad que chat/FluviaChat). El
 * contenido lo pone cada superficie.
 */
export function FluviaBox({
  context,
  children,
  className,
  headerExtra,
  size = 'sm',
  collapsible = false,
  defaultOpen = true,
}: FluviaBoxProps) {
  const [open, setOpen] = useState(defaultOpen);
  const Header: 'button' | 'div' = collapsible ? 'button' : 'div';
  return (
    <div className={cn('flex flex-col min-h-0', className)}>
      <Header
        {...(collapsible
          ? {
              type: 'button' as const,
              'aria-expanded': open,
              onClick: () => setOpen((o) => !o),
            }
          : {})}
        className={cn(
          'flex items-center gap-2.5 flex-wrap text-left w-full',
          open && 'mb-2',
          collapsible &&
            'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/40 rounded-sm'
        )}
      >
        <span
          className={cn(
            'rounded-md flex items-center justify-center bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white shrink-0',
            size === 'md' ? 'w-7 h-7' : 'w-6 h-6'
          )}
        >
          <Sparkles className={size === 'md' ? 'w-4 h-4' : 'w-3.5 h-3.5'} />
        </span>
        <span className={cn('font-bold text-[var(--text-primary)]', size === 'md' ? 'text-md' : 'text-sm')}>
          FluvIA <span className="text-[var(--accent-primary)] font-medium">{context}</span>
        </span>
        <span className="font-readout text-[9px] text-[var(--text-muted)] border border-[var(--border-subtle)] rounded-full px-2 py-0.5 uppercase tracking-wider">
          futuro asistente · demo
        </span>
        {headerExtra && <span className="ml-auto flex items-center gap-2 flex-wrap">{headerExtra}</span>}
        {collapsible && (
          <ChevronDown
            className={cn(
              'w-3.5 h-3.5 text-[var(--text-secondary)] shrink-0 transition-transform',
              !headerExtra && 'ml-auto',
              !open && '-rotate-90'
            )}
          />
        )}
      </Header>
      {(!collapsible || open) && (
        <div
          className={cn(
            'leading-relaxed text-[var(--text-secondary)] [&_b]:text-[var(--text-primary)] [&_b]:font-semibold',
            size === 'md' ? 'text-sm space-y-2' : 'text-xs'
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}
