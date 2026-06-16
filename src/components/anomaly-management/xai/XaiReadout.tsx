import { AlignLeft, ArrowRight } from 'lucide-react';
import type { ExplainInfo } from '@/lib/xai/explain';
import { UNKNOWN_PROC_COLOR } from '@/lib/xai/palette';
import type { ConnMode } from '@/lib/xai/types';

interface XaiReadoutProps {
  info: ExplainInfo;
  conn: ConnMode;
  procColor: Record<string, string>;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[9px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.13em] mb-1.5">
      {children}
    </p>
  );
}

function ProcDot({ color }: { color: string }) {
  return (
    <span
      className="inline-block w-2 h-2 rounded-full shrink-0"
      style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}` }}
    />
  );
}

function Bar({ pct }: { pct: number }) {
  return (
    <span className="flex-1 min-w-[36px] max-w-[96px] h-[5px] rounded-sm bg-[var(--bg-inset)] overflow-hidden">
      <span
        className="block h-full rounded-sm bg-gradient-to-r from-[var(--status-warning)] to-[var(--status-emergency)]"
        style={{ width: `${pct}%` }}
      />
    </span>
  );
}

function Flow({ s, t }: { s: string; t: string }) {
  return (
    <div className="flex items-center gap-2 font-readout text-xs text-[var(--text-primary)] py-0.5">
      <b className="font-semibold">{s}</b>
      <ArrowRight className="w-3 h-3 text-[var(--accent-primary)]" />
      <b className="font-semibold">{t}</b>
    </div>
  );
}

function ActionBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-[var(--status-advisory-muted)] border border-[var(--accent-primary)]/20 border-l-[3px] border-l-[var(--accent-primary)] rounded-sm px-2.5 py-2 text-xs text-[var(--text-primary)] leading-relaxed">
      <SectionLabel>Acción</SectionLabel>
      {children}
    </div>
  );
}

/**
 * Panel «Interpretación»: lectura estructurada del grafo. SIEMPRE describe la
 * lectura del MODELO (IA); cuando el lienzo muestra la red física se aclara.
 */
export function XaiReadout({ info, conn, procColor }: XaiReadoutProps) {
  return (
    <div className="absolute top-3 right-3 w-[280px] max-h-[calc(100%-24px)] overflow-auto scrollbar-thin bg-[var(--bg-surface)]/95 backdrop-blur border border-[var(--border-default)] rounded-md p-3 shadow-card">
      <div className="flex items-center gap-2 text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.14em] mb-2.5">
        <AlignLeft className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
        Interpretación
      </div>

      {info.kind === 'empty' ? (
        <p className="text-xs text-[var(--text-secondary)]">{info.message}</p>
      ) : (
        <div className="space-y-3">
          <span className="inline-block font-readout text-[9.5px] text-[var(--text-link)] bg-[var(--status-advisory-muted)] border border-[var(--accent-primary)]/30 rounded-full px-2.5 py-0.5 tracking-wide">
            {info.badge}
          </span>

          {conn !== 'ai' && (
            <p className="text-[11px] text-[var(--text-secondary)] leading-snug">
              Lectura del <b className="text-[var(--text-primary)]">modelo (IA)</b>
              {conn === 'phys' && (
                <>
                  {' '}
                  · el lienzo muestra la <b className="text-[var(--text-primary)]">red física</b> real.
                </>
              )}
            </p>
          )}

          {info.kind === 'frame' ? (
            <>
              <div>
                <SectionLabel>Foco</SectionLabel>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-readout text-md font-semibold text-[var(--text-primary)]">
                    {info.focus.id}
                  </span>
                  <span
                    className="text-[9.5px] font-semibold px-2 py-0.5 rounded-full border"
                    style={{
                      color: info.focus.col,
                      backgroundColor: `color-mix(in srgb, ${info.focus.col} 16%, transparent)`,
                      borderColor: `color-mix(in srgb, ${info.focus.col} 38%, transparent)`,
                    }}
                  >
                    {info.focus.sev}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-secondary)] mt-1">
                  <ProcDot color={procColor[info.focus.pk] ?? UNKNOWN_PROC_COLOR} />
                  {info.focus.proc}
                </div>
              </div>
              <div>
                <SectionLabel>Más anómalos</SectionLabel>
                <div className="space-y-1.5">
                  {info.top.map((t) => (
                    <div key={t.id} className="flex items-center gap-2 font-readout text-xs">
                      <ProcDot color={procColor[t.pk] ?? UNKNOWN_PROC_COLOR} />
                      <b className="min-w-[56px] font-semibold text-[var(--text-primary)]">{t.id}</b>
                      <Bar pct={Math.round(t.sc * 100)} />
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <SectionLabel>Influencia</SectionLabel>
                {info.influence ? (
                  <Flow s={info.influence.s} t={info.influence.t} />
                ) : (
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    Sin conexiones entre los más anómalos.
                  </p>
                )}
              </div>
              <ActionBox>{info.action}</ActionBox>
            </>
          ) : (
            <>
              <div>
                <SectionLabel>Procesos afectados</SectionLabel>
                <div className="flex flex-wrap gap-1.5">
                  {info.processes.map((p) => (
                    <span
                      key={p.pk}
                      className="text-[10px] px-2 py-0.5 rounded-full border"
                      style={{
                        color: procColor[p.pk] ?? UNKNOWN_PROC_COLOR,
                        backgroundColor: `color-mix(in srgb, ${procColor[p.pk] ?? UNKNOWN_PROC_COLOR} 15%, transparent)`,
                        borderColor: `color-mix(in srgb, ${procColor[p.pk] ?? UNKNOWN_PROC_COLOR} 36%, transparent)`,
                      }}
                    >
                      {p.name}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <SectionLabel>Sensor clave</SectionLabel>
                <span className="font-readout text-md font-semibold text-[var(--text-primary)]">
                  {info.key.id}
                </span>
                <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-secondary)] mt-1">
                  <ProcDot color={procColor[info.key.pk] ?? UNKNOWN_PROC_COLOR} />
                  {info.key.proc}
                </div>
                <div className="flex items-center gap-2 mt-1.5 font-readout text-[10.5px] text-[var(--text-secondary)]">
                  <Bar pct={info.key.pct} />
                  <span>
                    {info.key.count}/{info.key.total} instantes
                  </span>
                </div>
              </div>
              {info.intense && (
                <div>
                  <SectionLabel>Pico breve e intenso</SectionLabel>
                  <span className="font-readout text-xs font-semibold text-[var(--text-primary)]">
                    {info.intense.id}
                  </span>
                </div>
              )}
              {info.influences.length > 0 && (
                <div>
                  <SectionLabel>Influencias principales</SectionLabel>
                  <div className="space-y-0.5">
                    {info.influences.map((e) => (
                      <Flow key={`${e.s}>${e.t}`} s={e.s} t={e.t} />
                    ))}
                  </div>
                </div>
              )}
              {info.aparte.length > 0 && (
                <div>
                  <SectionLabel>Aparte</SectionLabel>
                  <p className="text-[11px] text-[var(--text-secondary)] leading-snug">
                    {info.aparte.join('; ')} — sin relación con el foco.
                  </p>
                </div>
              )}
              <ActionBox>{info.action}</ActionBox>
            </>
          )}
        </div>
      )}
    </div>
  );
}
