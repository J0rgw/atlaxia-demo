/**
 * SampleInstrumentCard
 * Read-only example card used by the Machines "type gallery" to showcase one
 * instrument of each ISA device type with its P&ID icon. Mirrors the look of the
 * real fallback sensor card but is clearly badged "ejemplo" and carries no live
 * data or interactions.
 */
import { getInstrumentIconByTag, getInstrumentLabel } from '@/lib/instrumentIcons';
import type { SampleInstrument } from '@/config/sampleInstruments';

export function SampleInstrumentCard({ sample }: { sample: SampleInstrument }) {
  const Icon = getInstrumentIconByTag(sample.tag);
  const typeLabel = getInstrumentLabel(sample.tag);

  return (
    <div className="rounded-md border border-dashed border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
      <div className="flex items-center justify-between mb-2 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Icon
            className="w-4 h-4 flex-shrink-0 text-[var(--text-secondary)]"
            aria-label={typeLabel}
          >
            <title>{typeLabel}</title>
          </Icon>
          <h3 className="font-bold text-[var(--text-primary)] text-sm truncate">{sample.tag}</h3>
        </div>
        <span className="flex-shrink-0 text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-[var(--bg-inset)] text-[var(--text-muted)]">
          ejemplo
        </span>
      </div>

      <div className="flex items-baseline gap-2 mb-2">
        <span className="font-readout font-bold text-3xl leading-none text-[var(--text-primary)]">
          {sample.value.toFixed(2)}
        </span>
        <span className="text-sm text-[var(--text-secondary)]">{sample.unit}</span>
      </div>

      <p className="text-xs text-[var(--text-muted)] truncate">{typeLabel}</p>
    </div>
  );
}

export default SampleInstrumentCard;
