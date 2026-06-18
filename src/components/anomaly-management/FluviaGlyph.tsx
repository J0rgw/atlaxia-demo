import { cn } from '@/lib/utils';

/**
 * Marca de FluvIA: glifo de flujo plano (tres líneas de corriente), sin
 * degradado ni sparkle. Identidad ÚNICA del copiloto en todas las superficies
 * (rail, resúmenes de evento). Antes había dos marcas distintas: el rail con
 * este glifo y FluviaBox con un sparkle sobre degradado. Esta es la unificada.
 */
export function FluviaGlyph({
  size = 'sm',
  className,
}: {
  size?: 'sm' | 'md';
  className?: string;
}) {
  const box = size === 'md' ? 'h-7 w-7' : 'h-6 w-6';
  const icon = size === 'md' ? 'h-4 w-4' : 'h-3.5 w-3.5';
  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-md bg-[var(--accent-primary)] text-white',
        box,
        className
      )}
    >
      <svg
        viewBox="0 0 16 16"
        className={icon}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        aria-hidden
      >
        <path d="M2 5.5c1.2-1.3 2.5-1.3 3.7 0s2.5 1.3 3.7 0 2.5-1.3 3.7 0" />
        <path d="M2 9c1.2-1.3 2.5-1.3 3.7 0s2.5 1.3 3.7 0 2.5-1.3 3.7 0" />
        <path d="M2 12.5c1.2-1.3 2.5-1.3 3.7 0s2.5 1.3 3.7 0 2.5-1.3 3.7 0" />
      </svg>
    </span>
  );
}
