/**
 * ProcessStrip — ISA-101 SCADA process flow.
 *
 * Topology-driven layout with snake wrapping:
 *   - mainFlow tiles fill rows of TILES_PER_ROW, snaking so the next row
 *     starts directly under where the previous row ended (even rows L→R,
 *     odd rows R→L). The wrap arrow is a clean vertical drop.
 *   - branches[] are interpreted two ways:
 *       * If branch.processId is also in mainFlow, the entry expresses a
 *         feedback edge (e.g. backwash recirculation): a dashed curved
 *         arc from that mainFlow tile back to connectsTo.
 *       * If branch.processId is NOT in mainFlow, it's a side branch —
 *         rendered as a row-below tile under its parent with a
 *         bidirectional loop connector and a small drain chip on the side.
 *   - The OUT endpoint chip sits adjacent to the last mainFlow tile, on
 *     the far side of the row's travel direction.
 *
 * Visual language follows ISA-101: muted neutral surfaces, color reserved
 * for active abnormality, left-edge status stripe, and a 5-level priority
 * legend below the canvas so the state of the plant is legible at a glance.
 */

import { Suspense, lazy, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/stores/languageStore';
import type { ProcessAreaStatus } from '@/types/industrial';
import type { ProcessTopology } from '@/types/installation';
import { toGraph } from '@/lib/processGraph';

const ProcessGraph = lazy(() =>
  import('./ProcessGraph').then((m) => ({ default: m.ProcessGraph }))
);

function GraphFallback() {
  return (
    <div className="flex items-center justify-center py-8">
      <svg className="animate-spin h-5 w-5 text-[var(--accent-primary)]" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
      </svg>
    </div>
  );
}

// --- Geometry -------------------------------------------------------------
const TILE_W = 180;
const TILE_H = 116;
const TILE_GAP = 24;        // horizontal gap between tiles within a row
const ROW_GAP = 72;         // vertical gap between rows
const ENDPOINT_W = 64;      // OUT chip
const CANVAS_PAD = 16;      // inner padding inside the canvas
const TILES_PER_ROW = 5;    // wrap threshold; SWAT (6 tiles) wraps once
const FEEDBACK_DASH = '5 3';

type Status = ProcessAreaStatus['status'];

interface ProcessStripProps {
  processStatuses: ProcessAreaStatus[];
  topology?: ProcessTopology;
  selectedProcess?: string | null;
  onProcessClick?: (id: string) => void;
  sensorValues?: Record<string, number>;
  processSensorTags?: Record<string, string[]>;
  className?: string;
}

// Hero readout priority — what an OT tech reads first per process stage.
const HERO_PRIORITY = ['FIT', 'LIT', 'AIT', 'PIT', 'DPIT'] as const;
const HERO_UNITS: Record<string, string> = {
  FIT: 'm3/h', LIT: 'mm', AIT: '', PIT: 'bar', DPIT: 'bar',
};

// Same fallback chain as ProcessGraph: a tile's sensor list and the
// telemetry value map can come from different config sources (survey vs
// defaults), so we try several key normalizations before giving up.
function resolveValue(tag: string, values: Record<string, number>): number | undefined {
  if (values[tag] !== undefined) return values[tag];
  const upper = tag.toUpperCase();
  if (values[upper] !== undefined) return values[upper];
  const stripped = upper.replace(/_(PV|STATE|STATUS|ALARM|VALUE)$/i, '');
  if (values[stripped] !== undefined) return values[stripped];
  const isaMatch = upper.match(/^([A-Z]+\d{3,4})/);
  if (isaMatch && values[isaMatch[1]] !== undefined) return values[isaMatch[1]];
  return undefined;
}

function pickHero(tags: string[] = [], values: Record<string, number> = {}) {
  for (const prefix of HERO_PRIORITY) {
    const tag = tags.find((t) => t.toUpperCase().startsWith(prefix));
    if (!tag) continue;
    const value = resolveValue(tag, values);
    if (value !== undefined) return { value, unit: HERO_UNITS[prefix] };
  }
  return null;
}

// --- ISA-101 color tokens -------------------------------------------------
// Status comes in 3 levels from the evaluator today (normal/warning/critical)
// but the LEGEND surfaces all 5 ISA-101 priorities so an OT tech sees the
// full vocabulary the system can communicate.
function stripeColor(s: Status): string {
  if (s === 'critical') return 'var(--status-critical)';
  if (s === 'warning')  return 'var(--status-warning)';
  return 'var(--border-default)';
}
function tileBg(s: Status): string {
  if (s === 'critical') return 'var(--status-critical-muted)';
  if (s === 'warning')  return 'var(--status-warning-muted)';
  return 'var(--bg-surface)';
}
function tileBorder(s: Status): string {
  if (s === 'critical') return 'var(--status-critical)';
  if (s === 'warning')  return 'var(--status-warning)';
  return 'var(--border-subtle)';
}
function readoutColor(s: Status): string {
  if (s === 'critical') return 'var(--status-critical)';
  if (s === 'warning')  return 'var(--status-warning)';
  return 'var(--text-primary)';
}

// --- Tile -----------------------------------------------------------------
interface TileProps {
  status: ProcessAreaStatus;
  hero: ReturnType<typeof pickHero>;
  selected: boolean;
  compact?: boolean;
  onClick: () => void;
}

function ProcessTile({ status, hero, selected, compact, onClick }: TileProps) {
  const level = status.status;
  const isCritical = level === 'critical';

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: TILE_W,
        height: compact ? TILE_H - 24 : TILE_H,
        borderColor: selected ? 'var(--accent-primary)' : tileBorder(level),
      }}
      className={cn(
        'relative shrink-0 cursor-pointer select-none rounded-md border text-left transition-colors',
        selected && 'ring-2 ring-[var(--accent-primary)]/30',
      )}
    >
      <div className="absolute inset-0 rounded-md" style={{ background: tileBg(level) }} />
      <div
        className={cn('absolute left-0 top-0 bottom-0 w-1 rounded-l-md', isCritical && 'animate-pulse')}
        style={{ background: stripeColor(level) }}
      />
      <div className="relative h-full flex flex-col">
        <div className="flex items-center justify-between px-3 pt-2 pb-0.5">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-secondary)] truncate">
            {status.name}
          </span>
          {status.sensorsInAlarm > 0 && (
            <span className="text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded bg-[var(--status-critical-muted)] text-[var(--status-critical)]">
              {status.sensorsInAlarm}
            </span>
          )}
        </div>
        <div className="flex-1 flex items-baseline justify-center gap-1 px-3 pb-2">
          {hero ? (
            <>
              <span
                className="font-readout font-bold text-3xl leading-none tabular-nums"
                style={{ color: readoutColor(level) }}
              >
                {hero.value.toFixed(1)}
              </span>
              {hero.unit && (
                <span className="text-xs text-[var(--text-muted)]">{hero.unit}</span>
              )}
            </>
          ) : (
            <span className="text-2xl text-[var(--text-muted)] tabular-nums">--</span>
          )}
        </div>
      </div>
    </button>
  );
}

// --- Endpoint chips (IN / OUT / DRAIN) ------------------------------------
function EndpointChip({ label, x, y, height }: { label: string; x: number; y: number; height: number }) {
  return (
    <div
      className="absolute flex items-center justify-center rounded-sm border border-dashed border-[var(--border-default)] bg-[var(--bg-surface)] text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]"
      style={{ left: x, top: y, width: ENDPOINT_W, height }}
    >
      {label}
    </div>
  );
}

// --- ISA-101 5-level legend ----------------------------------------------
function PriorityLegend() {
  const { t } = useTranslation();
  const levels: { token: string; label: string }[] = [
    { token: 'normal',    label: t('normal') },
    { token: 'advisory',  label: t('advisory') },
    { token: 'warning',   label: t('warning') },
    { token: 'critical',  label: t('critical') },
    { token: 'emergency', label: t('emergency') },
  ];
  return (
    <div className="flex items-center gap-3 flex-wrap px-1 pt-3 text-[11px] text-[var(--text-secondary)]">
      <span className="font-semibold uppercase tracking-wide text-[var(--text-muted)]">
        {t('priorityLegend')}
      </span>
      {levels.map((lv) => (
        <span key={lv.token} className="inline-flex items-center gap-1.5">
          <span
            className="inline-block w-2.5 h-2.5 rounded-sm border"
            style={{
              background: `var(--status-${lv.token}-muted)`,
              borderColor: `var(--status-${lv.token})`,
            }}
          />
          {lv.label}
        </span>
      ))}
    </div>
  );
}

// --- Connectors (SVG overlay) --------------------------------------------
// 'flow'      → straight directed line (within row, row→row wrap, into OUT)
// 'loop'      → vertical dashed line with arrowheads on both ends (side branch)
// 'feedback'  → dashed cubic-bezier arc, source-top → target-bottom
type Connector =
  | { kind: 'flow' | 'loop'; x1: number; y1: number; x2: number; y2: number }
  | { kind: 'feedback'; x1: number; y1: number; x2: number; y2: number };

function ConnectorLayer({ connectors, width, height }: { connectors: Connector[]; width: number; height: number }) {
  const stroke = 'var(--border-default)';
  return (
    <svg
      className="absolute pointer-events-none"
      width={width} height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ left: CANVAS_PAD, top: CANVAS_PAD }}
    >
      <defs>
        <marker id="psarrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="userSpaceOnUse">
          <path d="M0,0 L8,4 L0,8 Z" fill={stroke} />
        </marker>
      </defs>
      {connectors.map((c, i) => {
        if (c.kind === 'flow') {
          return (
            <line
              key={i}
              x1={c.x1} y1={c.y1} x2={c.x2} y2={c.y2}
              stroke={stroke} strokeWidth={2}
              markerEnd="url(#psarrow)"
            />
          );
        }
        if (c.kind === 'loop') {
          return (
            <line
              key={i}
              x1={c.x1} y1={c.y1} x2={c.x2} y2={c.y2}
              stroke={stroke} strokeWidth={2}
              strokeDasharray="4 3"
              markerStart="url(#psarrow)"
              markerEnd="url(#psarrow)"
            />
          );
        }
        // 'feedback' — orthogonal (right-angle) routing through the
        // inter-row midline: up from source, across to target column,
        // up into target's bottom edge. ISA-101 P&ID convention is
        // straight lines with sharp 90° corners, never bezier curves.
        const midY = (c.y1 + c.y2) / 2;
        const d = `M ${c.x1} ${c.y1} L ${c.x1} ${midY} L ${c.x2} ${midY} L ${c.x2} ${c.y2}`;
        return (
          <path
            key={i}
            d={d}
            stroke={stroke} strokeWidth={2}
            strokeDasharray={FEEDBACK_DASH}
            fill="none"
            strokeLinejoin="miter"
            markerEnd="url(#psarrow)"
          />
        );
      })}
    </svg>
  );
}

// --- Main component -------------------------------------------------------
export function ProcessStrip(props: ProcessStripProps) {
  // Graph-mode dispatch: when the topology carries an explicit edge list,
  // the plant is non-linear (splits / merges / cycles) and the snake layout
  // can't express it correctly — delegate to ProcessGraph. We pre-normalize
  // via toGraph() so legacy data (edges persisted with the `from_` key
  // before the Pydantic alias fix) downgrades to the linear renderer
  // instead of producing a broken DAG.
  const hasValidGraph =
    props.topology?.edges && props.topology.edges.length > 0
      ? toGraph(props.topology).edges.length > 0
      : false;
  if (hasValidGraph) {
    return (
      <Suspense fallback={<GraphFallback />}>
        <ProcessGraph {...props} topology={props.topology!} />
      </Suspense>
    );
  }
  return <ProcessStripLinear {...props} />;
}

function ProcessStripLinear({
  processStatuses, topology, selectedProcess, onProcessClick,
  sensorValues, processSensorTags, className,
}: ProcessStripProps) {
  const statusMap = useMemo(() => {
    const m = new Map<string, ProcessAreaStatus>();
    for (const p of processStatuses) m.set(p.id, p);
    return m;
  }, [processStatuses]);

  // Default to a linear chain when no topology was supplied (legacy callers
  // like the custom-page widget pass only statuses).
  const resolved = useMemo<ProcessTopology>(() => {
    if (topology) return topology;
    return { mainFlow: processStatuses.map((p) => p.id), branches: [] };
  }, [topology, processStatuses]);

  // ---- Geometry: snake layout for mainFlow + side-branch placement ----
  // Each mainFlow tile gets (x, y, row, col). Snake direction: even rows
  // L→R, odd rows R→L, so the wrap arrow between rows is a clean vertical
  // drop (the start of row N+1 is directly under the end of row N).
  const geometry = useMemo(() => {
    const mainFlow = resolved.mainFlow.filter((id) => statusMap.has(id));
    const tiles = new Map<string, { x: number; y: number; row: number; col: number }>();

    mainFlow.forEach((procId, i) => {
      const row = Math.floor(i / TILES_PER_ROW);
      const idxInRow = i % TILES_PER_ROW;
      const col = row % 2 === 0 ? idxInRow : TILES_PER_ROW - 1 - idxInRow;
      tiles.set(procId, {
        x: col * (TILE_W + TILE_GAP),
        y: row * (TILE_H + ROW_GAP),
        row, col,
      });
    });

    return { mainFlow, tiles };
  }, [resolved.mainFlow, statusMap]);

  // ---- Branch classification --------------------------------------------
  // A branch whose processId is ALSO in mainFlow is a feedback edge — drawn
  // as a curved arc, not a separate tile. Otherwise it's a side branch
  // (tile placed below its parent, with a bidirectional loop + drain).
  const { feedbackEdges, sideBranches } = useMemo(() => {
    const mainSet = new Set(geometry.mainFlow);
    const fb: typeof resolved.branches = [];
    const sb: typeof resolved.branches = [];
    for (const b of resolved.branches) {
      if (!statusMap.has(b.processId) || !geometry.tiles.has(b.connectsTo)) continue;
      if (mainSet.has(b.processId)) fb.push(b);
      else sb.push(b);
    }
    return { feedbackEdges: fb, sideBranches: sb };
  }, [resolved, geometry, statusMap]);

  // Side branches sit on a dedicated row below the lowest mainFlow row.
  const sideBranchRowY = useMemo(() => {
    if (sideBranches.length === 0) return 0;
    const lastMainRow = Math.max(
      0,
      Math.floor((geometry.mainFlow.length - 1) / TILES_PER_ROW),
    );
    return (lastMainRow + 1) * (TILE_H + ROW_GAP);
  }, [sideBranches, geometry.mainFlow.length]);

  const sidePositions = useMemo(() => {
    const m = new Map<string, { x: number; y: number }>();
    for (const b of sideBranches) {
      const parent = geometry.tiles.get(b.connectsTo);
      if (!parent) continue;
      m.set(b.processId, { x: parent.x, y: sideBranchRowY });
    }
    return m;
  }, [sideBranches, geometry.tiles, sideBranchRowY]);

  // ---- OUT endpoint placement ------------------------------------------
  // Adjacent to the last mainFlow tile, on the far side of the row's
  // travel direction (right for L→R rows, left for R→L rows).
  const lastIdx = geometry.mainFlow.length - 1;
  const lastTile = lastIdx >= 0 ? geometry.tiles.get(geometry.mainFlow[lastIdx])! : null;
  const lastRowDir = lastTile && lastTile.row % 2 === 0 ? 1 : -1; // 1 = L→R, -1 = R→L
  const outX = lastTile
    ? lastRowDir === 1
      ? lastTile.x + TILE_W + TILE_GAP
      : lastTile.x - TILE_GAP - ENDPOINT_W
    : 0;
  const outY = lastTile ? lastTile.y + TILE_H / 2 - 14 : 0;

  // ---- Canvas dimensions -----------------------------------------------
  const rowCount = Math.max(1, Math.ceil(geometry.mainFlow.length / TILES_PER_ROW));
  const canvasW = TILES_PER_ROW * TILE_W + (TILES_PER_ROW - 1) * TILE_GAP;
  const canvasH = sideBranches.length > 0
    ? sideBranchRowY + (TILE_H - 24)
    : rowCount * TILE_H + (rowCount - 1) * ROW_GAP;

  // ---- Connectors -------------------------------------------------------
  const connectors = useMemo<Connector[]>(() => {
    const list: Connector[] = [];

    // Forward flow: within-row arrows and snake wrap arrows.
    for (let i = 0; i < geometry.mainFlow.length - 1; i++) {
      const a = geometry.tiles.get(geometry.mainFlow[i])!;
      const b = geometry.tiles.get(geometry.mainFlow[i + 1])!;
      if (a.row === b.row) {
        const dir = a.row % 2 === 0 ? 1 : -1;
        const x1 = a.x + (dir === 1 ? TILE_W : 0);
        const x2 = b.x + (dir === 1 ? 0 : TILE_W);
        list.push({ kind: 'flow', x1, y1: a.y + TILE_H / 2, x2, y2: a.y + TILE_H / 2 });
      } else {
        // Snake wrap: vertical drop in the column they share.
        const cx = a.x + TILE_W / 2;
        list.push({ kind: 'flow', x1: cx, y1: a.y + TILE_H, x2: cx, y2: b.y });
      }
    }

    // Final flow into the OUT chip.
    if (lastTile) {
      const x1 = lastTile.x + (lastRowDir === 1 ? TILE_W : 0);
      const x2 = lastRowDir === 1 ? outX : outX + ENDPOINT_W;
      list.push({ kind: 'flow', x1, y1: lastTile.y + TILE_H / 2, x2, y2: lastTile.y + TILE_H / 2 });
    }

    // Side-branch loops: bidirectional vertical pipe from parent's bottom
    // down to the branch tile's top.
    for (const b of sideBranches) {
      const parent = geometry.tiles.get(b.connectsTo)!;
      const child = sidePositions.get(b.processId)!;
      const cx = parent.x + TILE_W / 2;
      list.push({ kind: 'loop', x1: cx, y1: parent.y + TILE_H, x2: cx, y2: child.y });
    }

    // Feedback edges: exit the source from its TOP CORNER on the side
    // facing the target (left corner if target is to the left, right
    // corner otherwise). This keeps the feedback's first vertical leg out
    // of the column used by the forward flow / wrap drop, so the two
    // lines don't run along each other. The arrow enters the target from
    // its bottom-center.
    for (const b of feedbackEdges) {
      const src = geometry.tiles.get(b.processId)!;
      const dst = geometry.tiles.get(b.connectsTo)!;
      const dstCx = dst.x + TILE_W / 2;
      const srcCx = src.x + TILE_W / 2;
      const srcExitX = dstCx < srcCx ? src.x : src.x + TILE_W;
      list.push({
        kind: 'feedback',
        x1: srcExitX, y1: src.y,
        x2: dstCx,    y2: dst.y + TILE_H,
      });
    }

    return list;
  }, [geometry, lastTile, lastRowDir, outX, sideBranches, sidePositions, feedbackEdges]);

  return (
    <div className={cn('rounded-md bg-[var(--bg-inset)] p-4', className)}>
      <div
        className="relative mx-auto"
        style={{
          width: canvasW + CANVAS_PAD * 2,
          height: canvasH + CANVAS_PAD * 2,
        }}
      >
        <ConnectorLayer connectors={connectors} width={canvasW} height={canvasH} />

        {/* mainFlow tiles */}
        {geometry.mainFlow.map((procId) => {
          const pos = geometry.tiles.get(procId)!;
          const status = statusMap.get(procId)!;
          const hero = pickHero(processSensorTags?.[procId], sensorValues);
          return (
            <div
              key={procId}
              className="absolute"
              style={{ left: CANVAS_PAD + pos.x, top: CANVAS_PAD + pos.y }}
            >
              <ProcessTile
                status={status}
                hero={hero}
                selected={selectedProcess === procId}
                onClick={() => onProcessClick?.(procId)}
              />
            </div>
          );
        })}

        {/* Side-branch tiles (when branch.processId is NOT in mainFlow) */}
        {sideBranches.map((b) => {
          const pos = sidePositions.get(b.processId);
          if (!pos) return null;
          const status = statusMap.get(b.processId)!;
          const hero = pickHero(processSensorTags?.[b.processId], sensorValues);
          return (
            <div
              key={b.processId}
              className="absolute"
              style={{ left: CANVAS_PAD + pos.x, top: CANVAS_PAD + pos.y }}
            >
              <ProcessTile
                status={status}
                hero={hero}
                selected={selectedProcess === b.processId}
                compact
                onClick={() => onProcessClick?.(b.processId)}
              />
            </div>
          );
        })}

        {/* OUT endpoint chip */}
        {lastTile && (
          <EndpointChip
            label="OUT"
            x={CANVAS_PAD + outX}
            y={CANVAS_PAD + outY}
            height={28}
          />
        )}
      </div>

      <PriorityLegend />
    </div>
  );
}

export default ProcessStrip;
