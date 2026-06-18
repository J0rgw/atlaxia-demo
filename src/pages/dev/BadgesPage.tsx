import { Badge } from '@/components/ui/Badge';
import { useLanguageStore } from '@/stores/languageStore';
import {
  REGISTRY,
  type Axis,
  type BadgeEntry,
  type ValueOf,
} from '@/lib/badges';

/* ── Sample event feed — exercises every axis together ─────────────────── */
interface SampleEvent {
  id: string;
  title: string;
  criticality: ValueOf<'criticality'>;
  state: ValueOf<'state'>;
  source: ValueOf<'source'>;
  reference: ValueOf<'reference'>;
}

const SAMPLE_EVENTS: SampleEvent[] = [
  {
    id: 'evt-1',
    title: 'Sobrepresión sostenida en bomba P-101',
    criticality: 'critical',
    state: 'confirmada',
    source: 'scada',
    reference: 'isa-18-2',
  },
  {
    id: 'evt-2',
    title: 'Escaneo de puertos hacia PLC-3',
    criticality: 'high',
    state: 'pendiente',
    source: 'snort',
    reference: 'iec-63303',
  },
  {
    id: 'evt-3',
    title: 'Desviación de caudal fuera de banda',
    criticality: 'medium',
    state: 'posible',
    source: 'scada',
    reference: 'isa-101',
  },
  {
    id: 'evt-4',
    title: 'Regla de firewall actualizada',
    criticality: 'low',
    state: 'falso-positivo',
    source: 'fortigate',
    reference: 'iec-63303',
  },
  {
    id: 'evt-5',
    title: 'Ciclo de planta dentro de parámetros',
    criticality: 'normal',
    state: 'confirmada',
    source: 'scada',
    reference: 'isa-101',
  },
];

/* ── Per-axis galleries (axis fixed → value list type-checked) ──────────── */
function AxisRow({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="text-[11px] font-semibold uppercase tracking-wider opacity-60">
        {title}
      </div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

const AXIS_NOTE: Record<Axis, string> = {
  criticality: 'ISA-18.2 · color',
  sensor: 'lectura · color',
  alert: 'alerta de red · color',
  anomaly: 'anomalía XAI · color',
  priority: 'Snort IDS · color · sin icono',
  state: 'triage · neutro graduado',
  importance: 'activo · neutro graduado',
  device: 'tipo dispositivo · neutro',
  entry: 'whitelist · neutro',
  flag: 'auto-flag · neutro',
  source: 'origen · neutro',
  reference: 'estándar · cobalto',
};

const AXES = Object.keys(REGISTRY) as Axis[];

function Gallery() {
  return (
    <div className="space-y-5">
      {AXES.map((axis) => (
        <AxisRow key={axis} title={`${axis} (${AXIS_NOTE[axis]})`}>
          {(REGISTRY[axis] as readonly BadgeEntry[]).map((e) => (
            <Badge
              key={e.value}
              axis={axis}
              value={e.value as ValueOf<typeof axis>}
            />
          ))}
        </AxisRow>
      ))}
      <AxisRow title="tag (id libre · neutro · sin icono)">
        <Badge tag="AIT202" />
        <Badge tag="LIT301" />
        <Badge tag="DPIT301" />
      </AxisRow>
    </div>
  );
}

function EventFeed() {
  return (
    <div className="space-y-3">
      <div className="text-[11px] font-semibold uppercase tracking-wider opacity-60">
        feed de eventos
      </div>
      <div className="space-y-2.5">
        {SAMPLE_EVENTS.map((evt) => (
          <div
            key={evt.id}
            className="flex flex-col gap-2 rounded-lg border p-3"
            style={{ borderColor: 'var(--cbd)', background: 'var(--chip)' }}
          >
            <div className="text-sm font-medium" style={{ color: 'var(--ink2)' }}>
              {evt.title}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge axis="criticality" value={evt.criticality} />
              <Badge axis="state" value={evt.state} />
              <Badge axis="source" value={evt.source} />
              <Badge axis="reference" value={evt.reference} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** A self-contained panel that forces a fixed badge theme (light | dark). */
function Panel({
  mode,
}: {
  mode: 'light' | 'dark';
}) {
  const isDark = mode === 'dark';
  return (
    <section
      data-badge-theme={mode}
      className="flex-1 min-w-[320px] rounded-2xl border p-6"
      style={{
        background: isDark ? '#0f1115' : '#ffffff',
        borderColor: isDark ? '#2d333e' : '#dde2ea',
        color: isDark ? '#dfe3ea' : '#2b313c',
      }}
    >
      <h2 className="mb-5 text-sm font-bold uppercase tracking-widest">
        {isDark ? 'Oscuro' : 'Claro'}
      </h2>
      <div className="space-y-8">
        <Gallery />
        <EventFeed />
      </div>
    </section>
  );
}

/**
 * Verification page for the <Badge> library. Shows every axis and a sample
 * event feed in both light and dark side by side, independent of the global
 * theme toggle (each panel forces its own badge tokens via data-badge-theme).
 * Reachable at /dev/badges.
 */
export function BadgesPage() {
  const lang = useLanguageStore((s) => s.language);
  const toggleLanguage = useLanguageStore((s) => s.toggleLanguage);
  return (
    <div className="min-h-screen w-full bg-[#e9edf3] p-6 md:p-10">
      <header className="mx-auto mb-8 flex max-w-[1400px] items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1f2b]">
            Atlaxia · Librería de etiquetas (Badge)
          </h1>
          <p className="mt-1 text-sm text-[#5d6a85]">
            Relleno macizo + icono · color exclusivo del eje criticality · resto
            neutro / referencias en cobalto.
          </p>
        </div>
        <button
          type="button"
          onClick={toggleLanguage}
          className="shrink-0 rounded-lg border border-[#cdd5e0] bg-white px-3 py-1.5 text-xs font-semibold text-[#2b313c] hover:bg-[#f4f6fa]"
        >
          Idioma: {lang.toUpperCase()} · cambiar
        </button>
      </header>
      <div className="mx-auto flex max-w-[1400px] flex-wrap gap-6">
        <Panel mode="light" />
        <Panel mode="dark" />
      </div>
    </div>
  );
}

export default BadgesPage;
