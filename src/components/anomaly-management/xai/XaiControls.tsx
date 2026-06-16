import { useState } from 'react';
import { ChevronDown, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { XaiSettings } from '@/lib/xai/types';
import { Segmented } from '../Segmented';

interface XaiControlsProps {
  ui: XaiSettings;
  onChange: (ui: XaiSettings) => void;
}

interface SliderRowProps {
  label: string;
  display: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (value: number) => void;
}

function SliderRow({ label, display, min, max, step = 1, value, onChange }: SliderRowProps) {
  return (
    <div className="space-y-1">
      <label className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
        <span>{label}</span>
        <span className="font-readout text-[11px] text-[var(--text-link)] bg-[var(--status-advisory-muted)] border border-[var(--accent-primary)]/30 rounded-sm px-1.5 min-w-[36px] text-center">
          {display}
        </span>
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1 cursor-pointer [accent-color:var(--accent-primary)]"
      />
    </div>
  );
}

function ControlGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <span className="block text-xs text-[var(--text-secondary)]">{label}</span>
      {children}
    </div>
  );
}

/**
 * Panel de controles vivos del subgrafo (overlay izquierdo del lienzo).
 * Desplegable; colapsado por defecto para dejar el lienzo limpio.
 */
export function XaiControls({ ui, onChange }: XaiControlsProps) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className={cn(
        'absolute top-3 left-3 bg-[var(--bg-surface)]/95 backdrop-blur border border-[var(--border-default)] rounded-md shadow-card',
        open ? 'w-[228px] p-3 space-y-3' : 'p-0'
      )}
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex items-center gap-2 text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.14em]',
          'transition-colors hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/40',
          open ? 'w-full' : 'px-3 py-2'
        )}
      >
        <SlidersHorizontal className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
        Controles
        <ChevronDown className={cn('w-3 h-3 ml-auto transition-transform', !open && '-rotate-90')} />
      </button>
      {!open ? null : (
        <>
      <SliderRow
        label="top-K principales"
        display={String(ui.K)}
        min={1}
        max={5}
        value={ui.K}
        onChange={(K) => onChange({ ...ui, K })}
      />
      <SliderRow
        label="vecinos / nodo"
        display={String(ui.N)}
        min={0}
        max={8}
        value={ui.N}
        onChange={(N) => onChange({ ...ui, N })}
      />
      <SliderRow
        label="profundidad (saltos)"
        display={String(ui.D)}
        min={1}
        max={3}
        value={ui.D}
        onChange={(D) => onChange({ ...ui, D })}
      />
      <SliderRow
        label="peso mín. arista"
        display={ui.W.toFixed(2)}
        min={0}
        max={60}
        value={Math.round(ui.W * 100)}
        onChange={(w) => onChange({ ...ui, W: w / 100 })}
      />
      <ControlGroup label="proceso">
        <Segmented
          ariaLabel="estilo de proceso"
          className="w-full [&>button]:flex-1"
          value={ui.proc}
          onChange={(proc) => onChange({ ...ui, proc })}
          options={[
            { value: 'ring', label: 'anillo' },
            { value: 'lazo', label: 'lazo' },
            { value: 'off', label: '—' },
          ]}
        />
      </ControlGroup>
      <ControlGroup label="etiqueta">
        <Segmented
          ariaLabel="contenido de etiqueta"
          className="w-full [&>button]:flex-1"
          value={ui.label}
          onChange={(label) => onChange({ ...ui, label })}
          options={[
            { value: 'sensor', label: 'sensor' },
            { value: 'equip', label: 'equipo' },
          ]}
        />
      </ControlGroup>
      <ControlGroup label="conexiones">
        <Segmented
          ariaLabel="tipo de conexiones"
          className="w-full [&>button]:flex-1"
          value={ui.conn}
          onChange={(conn) => onChange({ ...ui, conn })}
          options={[
            { value: 'ai', label: 'IA' },
            { value: 'phys', label: 'física' },
            { value: 'both', label: 'ambas' },
          ]}
        />
      </ControlGroup>
        </>
      )}
    </div>
  );
}
