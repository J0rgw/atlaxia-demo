import { useMemo } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import { cn } from '@/lib/utils';

/** Enlaces de fragmento `#evento-NN` → acción in-app (enfocar el episodio). */
const REF_RE = /^#evento-(\d+)$/;

interface FluviaMarkdownProps {
  markdown: string;
  /** Si se provee, las refs `#NN` se renderizan como botones que enfocan el evento. */
  onSelectRef?: (id: number) => void;
  className?: string;
}

/**
 * Renderiza markdown FluvIA con estilos tematizados (CSS vars): h2/h3 en
 * acento, blockquote sobre tinte advisory, code mono. Las refs `[#NN](#evento-NN)`
 * se interceptan y se convierten en botones que enfocan el episodio.
 */
export function FluviaMarkdown({ markdown, onSelectRef, className }: FluviaMarkdownProps) {
  const components = useMemo<Components>(
    () => ({
      h2: ({ children }) => (
        <h2 className="mt-3 mb-1 text-sm font-bold text-[var(--accent-primary)]">{children}</h2>
      ),
      h3: ({ children }) => (
        <h3 className="mt-3 mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--accent-primary)]">
          {children}
        </h3>
      ),
      p: ({ children }) => (
        <p className="mb-2 text-xs leading-relaxed text-[var(--text-secondary)] [&_strong]:font-semibold [&_strong]:text-[var(--text-primary)]">
          {children}
        </p>
      ),
      ul: ({ children }) => (
        <ul className="my-1.5 space-y-1 list-disc pl-4 marker:text-[var(--border-default)]">{children}</ul>
      ),
      ol: ({ children }) => (
        <ol className="my-1.5 space-y-1 list-decimal pl-4 marker:text-[var(--text-muted)]">{children}</ol>
      ),
      li: ({ children }) => (
        <li className="text-xs leading-relaxed text-[var(--text-secondary)] [&_strong]:font-semibold [&_strong]:text-[var(--text-primary)]">
          {children}
        </li>
      ),
      blockquote: ({ children }) => (
        <blockquote className="my-2 rounded-sm border-l-[3px] border-l-[var(--accent-primary)] bg-[var(--status-advisory-muted)] px-3 py-2 text-xs leading-relaxed text-[var(--text-secondary)] [&_p]:mb-0 [&_strong]:font-semibold [&_strong]:text-[var(--text-primary)]">
          {children}
        </blockquote>
      ),
      code: ({ children }) => (
        <code className="rounded-sm bg-[var(--bg-inset)] px-1 py-0.5 font-readout text-[0.95em] text-[var(--text-primary)]">
          {children}
        </code>
      ),
      a: ({ href, children }) => {
        const match = href?.match(REF_RE);
        if (match && onSelectRef) {
          const id = Number(match[1]);
          return (
            <button
              type="button"
              onClick={() => onSelectRef(id)}
              className="inline cursor-pointer rounded-sm align-baseline font-readout font-semibold text-[var(--text-link)] underline-offset-2 transition-colors hover:text-[var(--accent-primary)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/40"
            >
              {children}
            </button>
          );
        }
        return (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="text-[var(--text-link)] underline underline-offset-2 hover:text-[var(--accent-primary)]"
          >
            {children}
          </a>
        );
      },
    }),
    [onSelectRef]
  );

  return (
    <div className={cn('text-[var(--text-secondary)] [&>*:first-child]:mt-0 [&>*:last-child]:mb-0', className)}>
      <ReactMarkdown components={components}>{markdown}</ReactMarkdown>
    </div>
  );
}
