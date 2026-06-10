import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Sparkles } from 'lucide-react';
import { replay, type AttackManifestEntry } from '@/mocks/replay';

export function DemoCommandBar() {
  const [attacks, setAttacks] = useState<AttackManifestEntry[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const tick = () => {
      const list = replay.listAttacks();
      if (!cancelled && list.length > 0) {
        setAttacks(list);
        return true;
      }
      return false;
    };
    if (!tick()) {
      const id = setInterval(() => { if (tick()) clearInterval(id); }, 500);
      return () => { cancelled = true; clearInterval(id); };
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const handleInject = (id: string) => {
    setBusy(id);
    replay.injectAttackById(id);
    setTimeout(() => setBusy(null), 800);
    setOpen(false);
  };

  const handleReset = () => {
    localStorage.clear();
    sessionStorage.clear();
    replay.reset();
    window.location.reload();
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex h-8 w-full items-center gap-2 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-inset)] pl-3 pr-2 text-left text-sm text-[var(--text-secondary)] transition-colors hover:border-[var(--accent-primary)]/40 hover:text-[var(--text-primary)]"
      >
        <Sparkles className="h-4 w-4 text-[var(--accent-primary)]" />
        <span className="flex-1 truncate">Controles demo · inyectar ataque SWAT</span>
        <ChevronDown className={`h-4 w-4 text-[var(--text-muted)] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 max-h-[70vh] overflow-y-auto rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] shadow-2xl"
        >
          <div className="border-b border-[var(--border-subtle)] px-3 py-2">
            <p className="text-[11px] leading-snug text-[var(--text-muted)]">
              Inject a SWAT attack to watch the dashboards light up. The cursor jumps to the
              documented attack window, plays out for 30–60 s, then returns to the normal loop.
            </p>
          </div>

          {attacks.length === 0 ? (
            <div className="px-3 py-3 text-xs text-[var(--text-muted)]">
              Replay engine still loading…
            </div>
          ) : (
            <ul className="p-1.5">
              {attacks.map((att) => (
                <li key={att.id}>
                  <button
                    type="button"
                    onClick={() => handleInject(att.id)}
                    disabled={busy === att.id}
                    className="flex w-full items-start justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-xs text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-inset)] disabled:opacity-60"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium">{att.label}</div>
                      <div className="truncate text-[10px] text-[var(--text-muted)]">{att.process}</div>
                    </div>
                    <span className="shrink-0 text-[10px] uppercase tracking-wider text-[var(--accent-primary)]">
                      {busy === att.id ? 'sent' : 'inject'}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="border-t border-[var(--border-subtle)] p-2">
            <button
              type="button"
              onClick={handleReset}
              className="w-full rounded-md border border-[var(--status-warning)]/40 bg-[var(--status-warning-muted)] px-2.5 py-1.5 text-xs font-medium text-[var(--status-warning)] hover:opacity-90"
            >
              Reset demo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
