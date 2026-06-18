import { useState } from 'react';
import { ChevronUp, SlidersHorizontal } from 'lucide-react';
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
 * Controles vivos del subgrafo: tarjeta pegada a la esquina superior izquierda
 * del lienzo (sin margen; esquina inferior-derecha redondeada para anidar en el
 * borde del lienzo). Cerrada por defecto = botón con solo el icono; al abrir, la
 * MISMA tarjeta se despliega de ARRIBA A ABAJO mostrando los sliders debajo de la
 * cabecera (estética original). Render condicional del cuerpo → sin controles
 * enfocables cuando está cerrada (a11y) y la altura crece con el contenido.
 */
export function XaiControls({ ui, onChange }: XaiControlsProps) {
  const [open, setOpen] = useState(false);

  return (
    <div
      role="dialog"
      aria-label="Controles del grafo"
      className={cn(
        'absolute top-0 left-0 z-20 max-h-full overflow-y-auto scrollbar-thin rounded-br-lg border-b border-r border-[var(--border-default)] bg-[var(--bg-surface)]/95 shadow-card backdrop-blur',
        open && 'w-[228px]'
      )}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls="xai-controls-body"
        aria-label={open ? 'Cerrar controles' : 'Abrir controles'}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex items-center gap-2 px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]',
          'transition-colors hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent-primary)]/40',
          open && 'w-full border-b border-[var(--border-subtle)]'
        )}
      >
        <SlidersHorizontal className="h-3.5 w-3.5 shrink-0 text-[var(--accent-primary)]" />
        <span className="whitespace-nowrap">Controles</span>
        {open && <ChevronUp className="ml-auto h-3.5 w-3.5" />}
      </button>

      {open && (
        <div id="xai-controls-body" className="space-y-3 p-3">
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
        </div>
      )}
    </div>
  );
}
