/**
 * ProcessGraph — DAG renderer for non-linear process topologies.
 *
 * Used when ProcessTopology carries an explicit `nodes + edges` graph
 * (splits, merges, recycles, sensor fan-out, external source/sink).
 * Layout is computed by @dagrejs/dagre with a left-to-right layered
 * placement so the chain reads as p1 → p2 → … → pN; tiles reuse the
 * ISA-101 chrome from ProcessStrip so the two renderers are visually
 * coherent across simple and complex plants.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import Dagre from '@dagrejs/dagre';
import {
  ReactFlow,
  ReactFlowProvider,
  Handle,
  Position,
  useNodesInitialized,
  useReactFlow,
  type Edge,
  type Node,
  type NodeProps,
  type NodeTypes,
  type EdgeMarker,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { cn } from '@/lib/utils';
import { useTranslation } from '@/stores/languageStore';
import type { ProcessAreaStatus } from '@/types/industrial';
import type { EdgeKind, ProcessTopology } from '@/types/installation';
import { toGraph } from '@/lib/processGraph';

// --- Geometry --------------------------------------------------------------
const TILE_W = 180;
const TILE_H = 116;
const ENDPOINT_W = 92;
const ENDPOINT_H = 44;

// Mirrors ProcessStrip's hero readout so tiles read the same in both renderers.
const HERO_PRIORITY = ['FIT', 'LIT', 'AIT', 'PIT', 'DPIT'] as const;
const HERO_UNITS: Record<string, string> = {
  FIT: 'm3/h', LIT: 'mm', AIT: '', PIT: 'bar', DPIT: 'bar',
};

// Tries multiple key conventions because different config sources produce
// different sensor IDs: survey-derived ids are lowercase (`fit101_pv`),
// default-derived ids are uppercase ISA tags (`FIT101`), and raw TB keys
// can carry suffixes (`_PV`, `_STATUS`).
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

type Status = ProcessAreaStatus['status'];
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

// --- Node types ------------------------------------------------------------

interface ProcessNodeData extends Record<string, unknown> {
  status?: ProcessAreaStatus;
  hero: ReturnType<typeof pickHero>;
  selected: boolean;
}

const handleStyle = { background: 'transparent', border: 'none', width: 4, height: 4 };

// Click handling is delegated to ReactFlow's onNodeClick at the parent
// level — using an inner <button> here would swallow the pointer events
// that ReactFlow relies on to identify the clicked node.
function ProcessNodeView({ data }: NodeProps<Node<ProcessNodeData>>) {
  const status = data.status;
  const level: Status = status?.status ?? 'normal';
  const isCritical = level === 'critical';
  return (
    <div
      style={{
        width: TILE_W,
        height: TILE_H,
        borderColor: data.selected ? 'var(--accent-primary)' : tileBorder(level),
      }}
      className={cn(
        'relative cursor-pointer select-none rounded-md border transition-colors',
        data.selected && 'ring-2 ring-[var(--accent-primary)]/30',
      )}
    >
      <Handle type="target" position={Position.Top} style={handleStyle} />
      <Handle type="target" position={Position.Left} style={handleStyle} id="tl" />
      {/* Bottom-side handles are used exclusively by recycle/feedback edges
          so loop-closing arcs route below the trunk without overlapping
          forward flow on the left/right handles. */}
      <Handle type="target" position={Position.Bottom} style={handleStyle} id="tb" />
      <Handle type="source" position={Position.Bottom} style={handleStyle} id="sb" />
      <div className="absolute inset-0 rounded-md" style={{ background: tileBg(level) }} />
      <div
        className={cn('absolute left-0 top-0 bottom-0 w-1 rounded-l-md', isCritical && 'animate-pulse')}
        style={{ background: stripeColor(level) }}
      />
      <div className="relative h-full flex flex-col">
        <div className="flex items-center justify-between px-3 pt-2 pb-0.5">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-secondary)] truncate">
            {status?.name ?? ''}
          </span>
          {status && status.sensorsInAlarm > 0 && (
            <span className="text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded bg-[var(--status-critical-muted)] text-[var(--status-critical)]">
              {status.sensorsInAlarm}
            </span>
          )}
        </div>
        <div className="flex-1 flex items-baseline justify-center gap-1 px-3 pb-2">
          {data.hero ? (
            <>
              <span
                className="font-readout font-bold text-3xl leading-none tabular-nums"
                style={{ color: readoutColor(level) }}
              >
                {data.hero.value.toFixed(1)}
              </span>
              {data.hero.unit && (
                <span className="text-xs text-[var(--text-muted)]">{data.hero.unit}</span>
              )}
            </>
          ) : (
            <span className="text-2xl text-[var(--text-muted)] tabular-nums">--</span>
          )}
        </div>
      </div>
      <Handle type="source" position={Position.Right} style={handleStyle} id="sr" />
    </div>
  );
}

interface EndpointNodeData extends Record<string, unknown> {
  kind: 'source' | 'sink' | 'junction';
  label: string;
}

function EndpointNodeView({ data }: NodeProps<Node<EndpointNodeData>>) {
  return (
    <div style={{ width: ENDPOINT_W, height: ENDPOINT_H }}>
      <Handle type="target" position={Position.Top} style={handleStyle} />
      <Handle type="target" position={Position.Left} style={handleStyle} id="tl" />
      <div
        className="flex h-full w-full items-center justify-center rounded-sm border border-dashed border-[var(--border-default)] bg-[var(--bg-surface)] text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]"
      >
        {data.label}
      </div>
      <Handle type="source" position={Position.Bottom} style={handleStyle} />
      <Handle type="source" position={Position.Right} style={handleStyle} id="sr" />
    </div>
  );
}

const nodeTypes: NodeTypes = {
  process: ProcessNodeView,
  endpoint: EndpointNodeView,
};

// --- Edge styling ----------------------------------------------------------

const EDGE_STROKE = 'var(--border-default)';

function styleForKind(kind: EdgeKind): { style: React.CSSProperties; animated: boolean; markerEnd: EdgeMarker } {
  const marker: EdgeMarker = { type: MarkerType.ArrowClosed, color: EDGE_STROKE, width: 14, height: 14 };
  switch (kind) {
    case 'flow':
      return { style: { stroke: EDGE_STROKE, strokeWidth: 2 }, animated: false, markerEnd: marker };
    case 'feedback':
    case 'recycle':
      return {
        style: { stroke: EDGE_STROKE, strokeWidth: 2, strokeDasharray: '5 3' },
        animated: true,
        markerEnd: marker,
      };
    case 'bypass':
      return {
        style: { stroke: EDGE_STROKE, strokeWidth: 1.5, strokeDasharray: '2 3', opacity: 0.7 },
        animated: false,
        markerEnd: marker,
      };
    case 'drain':
      return { style: { stroke: EDGE_STROKE, strokeWidth: 2 }, animated: false, markerEnd: marker };
    case 'sensor':
      return {
        style: { stroke: EDGE_STROKE, strokeWidth: 1, opacity: 0.6 },
        animated: false,
        markerEnd: marker,
      };
  }
}

// --- Layout ----------------------------------------------------------------

function layout(nodes: Node[], edges: Edge[]): Node[] {
  const g = new Dagre.graphlib.Graph({ multigraph: true });
  // LR (left-to-right) reads as a process chain p1 → p2 → … → pN; feedback
  // and recycle edges drop below the trunk and arc back upstream.
  g.setGraph({ rankdir: 'LR', nodesep: 40, ranksep: 64, marginx: 16, marginy: 16 });
  g.setDefaultEdgeLabel(() => ({}));

  for (const n of nodes) {
    const width = n.type === 'endpoint' ? ENDPOINT_W : TILE_W;
    const height = n.type === 'endpoint' ? ENDPOINT_H : TILE_H;
    g.setNode(n.id, { width, height });
  }
  for (const e of edges) g.setEdge(e.source, e.target, {}, e.id);

  Dagre.layout(g);

  return nodes.map((n) => {
    const pos = g.node(n.id);
    if (!pos) return n;
    const width = n.type === 'endpoint' ? ENDPOINT_W : TILE_W;
    const height = n.type === 'endpoint' ? ENDPOINT_H : TILE_H;
    return { ...n, position: { x: pos.x - width / 2, y: pos.y - height / 2 } };
  });
}

// --- Legend ---------------------------------------------------------------

function PriorityLegend() {
  const { t } = useTranslation();
  const levels = [
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

// --- Inner / Public --------------------------------------------------------

interface ProcessGraphProps {
  processStatuses: ProcessAreaStatus[];
  topology: ProcessTopology;
  selectedProcess?: string | null;
  onProcessClick?: (id: string) => void;
  sensorValues?: Record<string, number>;
  processSensorTags?: Record<string, string[]>;
  className?: string;
  height?: number;
}

function ProcessGraphInner({
  processStatuses,
  topology,
  selectedProcess,
  onProcessClick,
  sensorValues,
  processSensorTags,
  height = 320,
}: Omit<ProcessGraphProps, 'className'>) {
  const { fitView } = useReactFlow();
  const ready = useNodesInitialized();
  const [didFit, setDidFit] = useState(false);

  const statusMap = useMemo(() => {
    const m = new Map<string, ProcessAreaStatus>();
    for (const p of processStatuses) m.set(p.id, p);
    return m;
  }, [processStatuses]);

  const { nodes, edges } = useMemo(() => {
    const graph = toGraph(topology);

    // Auto-inject a single OUT sink for trunk leaves — process nodes with
    // no outgoing forward edge. Recycle/feedback/sensor edges don't count,
    // so a node that only loops back upstream (e.g. Backwash → UF) is
    // still treated as a terminal stage. Mirrors the OUT chip that
    // ProcessStrip draws after the last linear tile.
    const hasOutgoingFlow = new Set<string>();
    for (const e of graph.edges) {
      if (e.kind === 'flow') hasOutgoingFlow.add(e.from);
    }
    const leaves = graph.nodes.filter(
      (n) => n.kind === 'process' && !hasOutgoingFlow.has(n.id),
    );
    const SINK_ID = '__out_sink__';
    const augmentedNodes = leaves.length > 0
      ? [...graph.nodes, { id: SINK_ID, label: 'OUT', kind: 'sink' as const }]
      : graph.nodes;
    const augmentedEdges = leaves.length > 0
      ? [
          ...graph.edges,
          ...leaves.map((leaf) => ({
            id: `flow_${leaf.id}__${SINK_ID}`,
            from: leaf.id,
            to: SINK_ID,
            kind: 'flow' as const,
          })),
        ]
      : graph.edges;

    const rfNodes: Node[] = augmentedNodes.map((n) => {
      if (n.kind === 'process') {
        return {
          id: n.id,
          type: 'process',
          position: { x: 0, y: 0 },
          data: {
            status: statusMap.get(n.id),
            hero: pickHero(processSensorTags?.[n.id], sensorValues),
            selected: selectedProcess === n.id,
          },
        };
      }
      return {
        id: n.id,
        type: 'endpoint',
        position: { x: 0, y: 0 },
        data: { kind: n.kind === 'sensor' ? 'junction' : n.kind, label: n.label || n.kind.toUpperCase() },
      };
    });

    const rfEdges: Edge[] = augmentedEdges.map((e) => {
      const styling = styleForKind(e.kind);
      const isLoop = e.kind === 'recycle' || e.kind === 'feedback';
      return {
        id: e.id,
        source: e.from,
        target: e.to,
        // Trunk flow uses right→left handles for a clean horizontal chain.
        // Loop-closing edges (recycle/feedback) drop out the bottom and
        // re-enter at the bottom, so the arc routes below the trunk
        // instead of running over the top of intermediate tiles.
        sourceHandle: isLoop ? 'sb' : 'sr',
        targetHandle: isLoop ? 'tb' : 'tl',
        label: 'label' in e ? e.label : undefined,
        labelStyle: { fontSize: 10, fill: 'var(--text-muted)' },
        labelBgStyle: { fill: 'var(--bg-inset)' },
        // ISA-101 P&ID: orthogonal routing with sharp miter corners.
        // `step` draws right-angle elbows for trunk flow; loops use
        // `smoothstep` with a small radius so the under-trunk arc reads
        // as a return path, not a misrouted flow line. Self-loops fall
        // back to default since neither `step` variant routes them.
        type: e.from === e.to ? 'default' : isLoop ? 'smoothstep' : 'step',
        pathOptions: { borderRadius: isLoop ? 16 : 0 },
        ...styling,
      };
    });

    // Dagre is sensitive to cycles: a recycle/feedback edge in a cyclic
    // topology (e.g. Backwash → UF) makes its longest-path ranker push
    // unrelated nodes onto extra ranks to break the cycle. Strip those
    // edges from the layout input so Dagre sees a clean DAG; they're
    // still rendered (rfEdges keeps them) as dashed annotations.
    const NON_TRUNK = new Set<EdgeKind>(['recycle', 'feedback', 'sensor']);
    const layoutEdges = rfEdges.filter((_, i) => !NON_TRUNK.has(augmentedEdges[i].kind));
    return { nodes: layout(rfNodes, layoutEdges), edges: rfEdges };
  }, [topology, statusMap, selectedProcess, processSensorTags, sensorValues]);

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (node.type === 'process') onProcessClick?.(node.id);
    },
    [onProcessClick],
  );

  useEffect(() => {
    if (ready && !didFit && nodes.length > 0) {
      fitView({ padding: 0.15, duration: 300 });
      setDidFit(true);
    }
  }, [ready, didFit, nodes.length, fitView]);

  return (
    <div style={{ height }} className="w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={handleNodeClick}
        fitView
        proOptions={{ hideAttribution: true }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        // Hand wheel events back to the page so the diagram doesn't
        // hijack scrolling. Users can still pinch-zoom or use the
        // built-in controls; this is an overview canvas, not an editor.
        panOnScroll={false}
        zoomOnScroll={false}
        zoomOnPinch={false}
        zoomOnDoubleClick={false}
        preventScrolling={false}
        panOnDrag={false}
      />

    </div>
  );
}

export function ProcessGraph({ className, ...rest }: ProcessGraphProps) {
  return (
    <div className={cn('rounded-md bg-[var(--bg-inset)] p-4', className)}>
      <ReactFlowProvider>
        <ProcessGraphInner {...rest} />
      </ReactFlowProvider>
      <PriorityLegend />
    </div>
  );
}

export default ProcessGraph;
