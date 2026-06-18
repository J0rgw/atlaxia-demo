import { AlignLeft, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { toneFor } from '@/lib/badges';
import { sevValue } from '@/lib/xai/heat';
import type { ExplainInfo } from '@/lib/xai/explain';
import type { ConnMode } from '@/lib/xai/types';

interface XaiReadoutProps {
  info: ExplainInfo;
  conn: ConnMode;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.13em] mb-1.5">
      {children}
    </p>
  );
}

/**
 * Lectura numérica del grado de anomalía del modelo (0–1), como chip coloreado
 * por banda. Reusa tokens y geometría del sistema de badges (--badge-<tono>-*,
 * --r-chip, --font-badge): el color saturado = banda de criticidad, coherente
 * con el invariante. Contenido DINÁMICO (un número) → no es un badge de registro;
 * la banda se deriva con toneFor('anomaly', sevValue(score)).
 */
function ScoreBadge({ score }: { score: number }) {
  const tone = toneFor('anomaly', sevValue(score));
  return (
    <span
      title={`Grado de anomalía ${score.toFixed(2)} (0–1) · modelo IA`}
      className="inline-flex h-[25px] shrink-0 items-center px-[10px] text-[11px] font-medium leading-none tracking-[0.03em] tabular-nums"
      style={{
        background: `var(--badge-${tone}-bg)`,
        color: `var(--badge-${tone}-fg)`,
        borderRadius: 'var(--r-chip)',
        fontFamily: 'var(--font-badge)',
      }}
    >
      {score.toFixed(2)}
    </span>
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
    <div className="bg-[var(--status-advisory-muted)] border border-[var(--accent-primary)]/25 rounded-sm px-2.5 py-2 text-xs text-[var(--text-primary)] leading-relaxed">
      <SectionLabel>Acción</SectionLabel>
      {children}
    </div>
  );
}

/**
 * Panel «Interpretación»: lectura estructurada del grafo. SIEMPRE describe la
 * lectura del MODELO (IA); cuando el lienzo muestra la red física se aclara.
 */
export function XaiReadout({ info, conn }: XaiReadoutProps) {
  return (
    <div className="absolute top-3 right-3 w-[280px] max-h-[calc(100%-24px)] overflow-auto scrollbar-thin bg-[var(--bg-surface)]/95 backdrop-blur border border-[var(--border-default)] rounded-md p-3 shadow-card">
      <div className="flex items-center gap-2 text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.14em] mb-2.5">
        <AlignLeft className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
        Interpretación
        <span className="font-normal text-[var(--accent-primary)]">· modelo IA</span>
      </div>

      {info.kind === 'empty' ? (
        <p className="text-xs text-[var(--text-secondary)]">{info.message}</p>
      ) : (
        <div className="space-y-3">
          {/* caption del panel (frame vs resumen): es metadato, NO un estado →
              leyenda muted, no una pill que finja ser badge del sistema. */}
          <p className="font-readout text-[10px] uppercase tracking-[0.13em] text-[var(--text-muted)]">
            {info.badge}
          </p>

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
              {/* enmarca el número: es el grado de anomalía estimado por el modelo */}
              <p className="text-[11px] leading-snug text-[var(--text-secondary)]">
                <b className="text-[var(--text-primary)]">Grado de anomalía</b> por sensor (0–1),
                estimado por el modelo.
              </p>
              <div>
                <SectionLabel>Foco</SectionLabel>
                <div className="flex items-center gap-2 flex-wrap">
                  {/* sensor en badge (tag) + score de anomalía (chip numérico
                      coloreado por banda). */}
                  <Badge tag={info.focus.id} />
                  <ScoreBadge score={info.focus.score} />
                </div>
                <p className="mt-1 text-[11px] text-[var(--text-secondary)]">{info.focus.proc}</p>
              </div>
              <div>
                <SectionLabel>Valor de Anomalías</SectionLabel>
                <div className="space-y-1.5">
                  {info.top.map((t) => (
                    <div key={t.id} className="flex items-center gap-2">
                      <Badge tag={t.id} />
                      <ScoreBadge score={t.sc} />
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
                {/* texto plano (no badges): el badge se reserva para el sensor. */}
                <p className="text-[11px] text-[var(--text-secondary)] leading-snug">
                  {info.processes.map((p) => p.name).join(' · ')}
                </p>
              </div>
              <div>
                <SectionLabel>Sensor clave</SectionLabel>
                <Badge tag={info.key.id} />
                <p className="mt-1 text-[11px] text-[var(--text-secondary)]">{info.key.proc}</p>
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
                    {info.aparte.join('; ')}. Sin relación con el foco.
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
