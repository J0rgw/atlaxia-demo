import { useEffect, useMemo, useRef, useState } from 'react';
import { explainGraph } from '@/lib/xai/explain';
import { buildRenderState } from '@/lib/xai/subgraph';
import { SWAT_DEMO_DATASET } from '@/lib/xai/data';
import type { XaiHoverInfo, XaiMode, XaiSettings } from '@/lib/xai/types';
import { Segmented } from '../Segmented';
import { useXaiEngine } from './useXaiEngine';
import { XaiControls } from './XaiControls';
import { XaiReadout } from './XaiReadout';
import { XaiTimeline } from './XaiTimeline';

const PLAY_INTERVAL_MS = 140;

const DEFAULT_UI: XaiSettings = {
  K: 3,
  N: 5,
  D: 1,
  W: 0.1,
  proc: 'ring',
  label: 'sensor',
  conn: 'ai',
};

/**
 * Tab «Grafo XAI»: explicabilidad del evento sobre el grafo aprendido por el
 * modelo (port a componentes del prototipo docs/xai-graph/prototype-focus.html;
 * decisiones de representación en docs/xai-graph/XAI-graph.md §8).
 * Datos sintéticos de demo — el producto conectará adyacencia del checkpoint +
 * scores por replay de la ventana del evento.
 */
export function XaiGraphTab() {
  const dataset = SWAT_DEMO_DATASET;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<XaiMode>('global');
  const [frame, setFrame] = useState(dataset.nFrames - 1);
  const [playing, setPlaying] = useState(false);
  const [ui, setUi] = useState<XaiSettings>(DEFAULT_UI);
  const [hover, setHover] = useState<XaiHoverInfo | null>(null);
  const [reducedMotion, setReducedMotion] = useState(
    () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  );

  useXaiEngine(canvasRef, dataset, { mode, frame, ui, onHover: setHover });

  // Reacciona a cambios de la preferencia del SO en caliente.
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mq) return;
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Auto-play del recorrido de frames: la ÚNICA animación automática del tab
  // (el render loop del engine solo repinta la interacción, la física asienta
  // síncrona en settle()). Bajo prefers-reduced-motion no se auto-avanza; el
  // usuario sigue pudiendo desplazar el frame con el slider manualmente.
  useEffect(() => {
    if (!playing || reducedMotion) return;
    const timer = setInterval(
      () => setFrame((f) => (f + 1) % dataset.nFrames),
      PLAY_INTERVAL_MS
    );
    return () => clearInterval(timer);
  }, [playing, reducedMotion, dataset.nFrames]);

  const analysis = useMemo(
    () => ({
      explain: explainGraph(dataset, mode, frame, ui),
      nodeCount: buildRenderState(dataset, mode, frame, ui).nodes.length,
    }),
    [dataset, mode, frame, ui]
  );

  return (
    <div className="flex flex-col gap-3 h-full min-h-0">
      <div className="flex items-center gap-3 flex-wrap">
        <Segmented
          ariaLabel="Modo de vista del grafo"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'global', label: 'Global agregado' },
            { value: 'frame', label: 'Frame a frame' },
          ]}
        />
      </div>

      <div className="relative flex-1 min-h-[380px] rounded-md border border-[var(--border-subtle)] overflow-hidden bg-[var(--bg-base)] bg-[radial-gradient(var(--border-subtle)_1px,transparent_1.4px)] [background-size:26px_26px]">
        <canvas
          ref={canvasRef}
          className="block w-full h-full cursor-grab"
          aria-label="Grafo interactivo de sensores: pasa el ratón por un nodo para enfocar su red, rueda para zoom, arrastra el fondo para desplazar"
        />
        <XaiControls ui={ui} onChange={setUi} />
        <XaiReadout info={analysis.explain} conn={ui.conn} procColor={dataset.procColor} />
        {hover && (
          <div
            className="absolute pointer-events-none z-10 bg-[var(--bg-surface-raised)] border border-[var(--border-default)] rounded-sm px-2.5 py-1.5 font-readout text-[11px] text-[var(--text-primary)] leading-relaxed shadow-card"
            style={{
              left: Math.min(hover.x + 14, Math.max(0, (canvasRef.current?.clientWidth ?? 600) - 230)),
              top: Math.min(hover.y + 12, Math.max(0, (canvasRef.current?.clientHeight ?? 400) - 64)),
            }}
          >
            <b className="text-[var(--text-link)]">{hover.id}</b>{' '}
            <span className="text-[var(--text-muted)]">{hover.proc}</span>
            {hover.equip && <> · {hover.equip}</>}
            <br />
            {hover.sub}
          </div>
        )}
        <div className="absolute bottom-2.5 left-3 font-readout text-[10px] text-[var(--text-muted)] bg-[var(--bg-surface)]/85 border border-[var(--border-subtle)] rounded-sm px-2 py-1">
          pasa el ratón = enfocar · rueda = zoom · arrastra fondo = pan
        </div>
      </div>

      <XaiTimeline
        mode={mode}
        frame={frame}
        nFrames={dataset.nFrames}
        nodeCount={analysis.nodeCount}
        playing={playing}
        onFrameChange={setFrame}
        onTogglePlay={() => setPlaying((p) => !p)}
      />
    </div>
  );
}
