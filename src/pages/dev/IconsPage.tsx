import { useLanguageStore } from '@/stores/languageStore';
import {
  INSTRUMENT_ICON_REGISTRY,
  FALLBACK_INSTRUMENT_ICON,
  getInstrumentIconByTag,
  getInstrumentLabel,
} from '@/lib/instrumentIcons';

/* ── Theme tokens per panel (icons inherit `currentColor` from the section) ─ */
interface Tokens {
  isDark: boolean;
  cardBg: string;
  cardBorder: string;
  subtle: string;
}

function tokensFor(mode: 'light' | 'dark'): Tokens {
  const isDark = mode === 'dark';
  return {
    isDark,
    cardBg: isDark ? '#161a21' : '#f7f9fc',
    cardBorder: isDark ? '#2d333e' : '#dde2ea',
    subtle: isDark ? '#9aa3b2' : '#5d6a85',
  };
}

/* ── Sample real tags — shows each icon in its card-header context ──────── */
const IN_CONTEXT_TAGS = ['LIT101', 'FIT101', 'AIT201', 'DPIT301', 'MV101', 'P101', 'UV401'];

function SectionTitle({ children, subtle }: { children: React.ReactNode; subtle: string }) {
  return (
    <div
      className="text-[11px] font-semibold uppercase tracking-wider"
      style={{ color: subtle }}
    >
      {children}
    </div>
  );
}

/* ── Full icon gallery — one cell per ISA instrument type ───────────────── */
function Gallery({ t }: { t: Tokens }) {
  return (
    <div className="space-y-2">
      <SectionTitle subtle={t.subtle}>tipos de instrumento (P&amp;ID · ISA 5.1)</SectionTitle>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {INSTRUMENT_ICON_REGISTRY.map((e) => (
          <div
            key={e.type}
            className="flex flex-col items-center gap-1.5 rounded-lg border p-3 text-center"
            style={{ borderColor: t.cardBorder, background: t.cardBg }}
          >
            <e.Icon className="h-8 w-8" aria-label={e.label}>
              <title>{e.label}</title>
            </e.Icon>
            <div className="font-mono text-xs font-semibold">{e.prefix}</div>
            <div className="text-[11px] leading-tight" style={{ color: t.subtle }}>
              {e.label}
            </div>
            <div className="font-mono text-[10px]" style={{ color: t.subtle, opacity: 0.85 }}>
              ej. {e.example}
            </div>
          </div>
        ))}

        {/* Fallback — tags whose prefix matches no known type */}
        <div
          className="flex flex-col items-center gap-1.5 rounded-lg border border-dashed p-3 text-center"
          style={{ borderColor: t.cardBorder, background: t.cardBg }}
        >
          <FALLBACK_INSTRUMENT_ICON className="h-8 w-8" aria-label="Genérico">
            <title>Genérico</title>
          </FALLBACK_INSTRUMENT_ICON>
          <div className="font-mono text-xs font-semibold">—</div>
          <div className="text-[11px] leading-tight" style={{ color: t.subtle }}>
            Genérico (balloon ISA)
          </div>
          <div className="font-mono text-[10px]" style={{ color: t.subtle, opacity: 0.85 }}>
            sin tipo
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── In-context — how the icon sits in a sensor card header ─────────────── */
function InContext({ t }: { t: Tokens }) {
  return (
    <div className="space-y-2">
      <SectionTitle subtle={t.subtle}>en cabecera de tarjeta</SectionTitle>
      <div className="space-y-2">
        {IN_CONTEXT_TAGS.map((tag) => {
          const Icon = getInstrumentIconByTag(tag);
          const label = getInstrumentLabel(tag);
          return (
            <div
              key={tag}
              className="flex items-center gap-2 rounded-lg border px-3 py-2"
              style={{ borderColor: t.cardBorder, background: t.cardBg }}
            >
              <Icon className="h-4 w-4 flex-shrink-0" style={{ color: t.subtle }} />
              <span className="font-mono text-sm font-bold">{tag}</span>
              <span className="ml-auto text-[11px]" style={{ color: t.subtle }}>
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** A self-contained panel rendering the icons on a fixed (light | dark) surface. */
function Panel({ mode }: { mode: 'light' | 'dark' }) {
  const t = tokensFor(mode);
  return (
    <section
      className="flex-1 min-w-[320px] rounded-2xl border p-6"
      style={{
        background: t.isDark ? '#0f1115' : '#ffffff',
        borderColor: t.isDark ? '#2d333e' : '#dde2ea',
        color: t.isDark ? '#dfe3ea' : '#2b313c',
      }}
    >
      <h2 className="mb-5 text-sm font-bold uppercase tracking-widest">
        {t.isDark ? 'Oscuro' : 'Claro'}
      </h2>
      <div className="space-y-8">
        <Gallery t={t} />
        <InContext t={t} />
      </div>
    </section>
  );
}

/**
 * Verification page for the instrument icon library. Shows every ISA device
 * type and its hand-drawn P&ID symbol in both light and dark side by side,
 * independent of the global theme. Reachable at /dev/icons.
 *
 * Source: symbols in src/components/sensors/InstrumentSymbols.tsx, resolved by
 * ISA type in src/lib/instrumentIcons.ts.
 */
export function IconsPage() {
  const lang = useLanguageStore((s) => s.language);
  const toggleLanguage = useLanguageStore((s) => s.toggleLanguage);
  return (
    <div className="min-h-screen w-full bg-[#e9edf3] p-6 md:p-10">
      <header className="mx-auto mb-8 flex max-w-[1400px] items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1f2b]">
            Atlaxia · Iconos de instrumentos (P&amp;ID)
          </h1>
          <p className="mt-1 text-sm text-[#5d6a85]">
            Símbolos SVG dibujados a mano en{' '}
            <code className="rounded bg-white/70 px-1 py-0.5 font-mono text-xs">
              InstrumentSymbols.tsx
            </code>{' '}
            · resueltos por prefijo de tag ISA en{' '}
            <code className="rounded bg-white/70 px-1 py-0.5 font-mono text-xs">
              instrumentIcons.ts
            </code>
            . Sin librería externa.
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

export default IconsPage;
