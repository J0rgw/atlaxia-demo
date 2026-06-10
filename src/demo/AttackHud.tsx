import { useEffect, useState } from 'react';
import { replay, type AttackManifestEntry } from '@/mocks/replay';

const HUD_HIDDEN_FLAG = 'demo.hudHidden';

export function AttackHud() {
  const [attacks, setAttacks] = useState<AttackManifestEntry[]>([]);
  const [open, setOpen] = useState(true);
  const [hidden, setHidden] = useState(() => localStorage.getItem(HUD_HIDDEN_FLAG) === 'true');
  const [busy, setBusy] = useState<string | null>(null);

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

  if (hidden) {
    return (
      <button
        type="button"
        onClick={() => { localStorage.removeItem(HUD_HIDDEN_FLAG); setHidden(false); }}
        className="fixed right-4 bottom-4 z-[9999] rounded-md bg-[var(--accent-primary)] px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-white shadow-lg"
      >
        Demo HUD
      </button>
    );
  }

  const handleInject = async (id: string) => {
    setBusy(id);
    replay.injectAttackById(id);
    setTimeout(() => setBusy(null), 800);
  };

  const handleReset = () => {
    localStorage.clear();
    sessionStorage.clear();
    replay.reset();
    window.location.reload();
  };

  return (
    <div className="fixed right-4 bottom-4 z-[9999] w-80 rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] shadow-2xl">
      <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-[var(--accent-primary)]" />
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-primary)]">
            Demo controls
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="rounded px-1.5 py-0.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-inset)]"
            aria-label={open ? 'Collapse' : 'Expand'}
          >
            {open ? '–' : '+'}
          </button>
          <button
            type="button"
            onClick={() => { localStorage.setItem(HUD_HIDDEN_FLAG, 'true'); setHidden(true); }}
            className="rounded px-1.5 py-0.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-inset)]"
            aria-label="Hide"
          >
            ×
          </button>
        </div>
      </div>

      {open && (
        <div className="space-y-2 p-3">
          <p className="text-[11px] leading-snug text-[var(--text-muted)]">
            Inject a SWAT attack to watch the dashboards light up. The cursor jumps to the
            documented attack window, plays out for 30–60 s, then returns to the normal loop.
          </p>

          {attacks.length === 0 && (
            <div className="rounded bg-[var(--bg-inset)] px-3 py-2 text-xs text-[var(--text-muted)]">
              Replay engine still loading…
            </div>
          )}

          <div className="space-y-1.5">
            {attacks.map((att) => (
              <button
                key={att.id}
                type="button"
                onClick={() => handleInject(att.id)}
                disabled={busy === att.id}
                className="flex w-full items-start justify-between gap-2 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-base)] px-2.5 py-1.5 text-left text-xs text-[var(--text-primary)] transition-colors hover:border-[var(--accent-primary)] hover:bg-[var(--bg-inset)] disabled:opacity-60"
              >
                <div className="min-w-0">
                  <div className="truncate font-medium">{att.label}</div>
                  <div className="truncate text-[10px] text-[var(--text-muted)]">{att.process}</div>
                </div>
                <span className="shrink-0 text-[10px] uppercase tracking-wider text-[var(--accent-primary)]">
                  {busy === att.id ? 'sent' : 'inject'}
                </span>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleReset}
            className="w-full rounded-md border border-[var(--status-warning)]/40 bg-[var(--status-warning-muted)] px-2.5 py-1.5 text-xs font-medium text-[var(--status-warning)] hover:opacity-90"
          >
            Reset demo
          </button>
        </div>
      )}
    </div>
  );
}
