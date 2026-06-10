/**
 * Process-graph utilities.
 *
 * The runtime topology model is dual: a legacy `mainFlow + branches` view
 * (linear trunk + side branches) and an optional `nodes + edges` graph that
 * can express splits, merges, cycles, sensor fan-out and external
 * sources/sinks. These helpers convert between the two and classify edges.
 */

import type {
  BranchConfig,
  EdgeKind,
  ProcessEdge,
  ProcessNode,
  ProcessTopology,
} from '@/types/installation';

export interface ProcessGraphData {
  nodes: ProcessNode[];
  edges: ProcessEdge[];
}

/**
 * Defensive normalization for edges coming from the API.
 *
 * Pre-fix backend builds (Pydantic ProcessEdge without serialization_alias)
 * persisted the `from` field as `from_`. Drop this normalization once all
 * deployed configs are known to be on the corrected wire format.
 */
function normalizeEdge(raw: unknown): ProcessEdge | null {
  if (!raw || typeof raw !== 'object') return null;
  const e = raw as Record<string, unknown>;
  const from = (e.from ?? e.from_) as string | undefined;
  const to = e.to as string | undefined;
  if (!from || !to || typeof e.id !== 'string') return null;
  return {
    id: e.id,
    from,
    to,
    kind: (e.kind as ProcessEdge['kind']) ?? 'flow',
    label: e.label as string | undefined,
    condition: e.condition as string | undefined,
  };
}

/** Returns the graph view, materializing it from legacy fields if necessary. */
export function toGraph(topology: ProcessTopology): ProcessGraphData {
  if (topology.nodes && topology.edges) {
    const edges = topology.edges
      .map((e) => normalizeEdge(e))
      .filter((e): e is ProcessEdge => e !== null);
    return { nodes: topology.nodes, edges };
  }
  return fromLegacy(topology.mainFlow, topology.branches);
}

/** Builds a graph from the legacy `mainFlow + branches` shape. */
export function fromLegacy(
  mainFlow: string[],
  branches: BranchConfig[],
): ProcessGraphData {
  const nodes: ProcessNode[] = [];
  const seen = new Set<string>();

  for (const id of mainFlow) {
    if (seen.has(id)) continue;
    seen.add(id);
    nodes.push({ id, label: id, kind: 'process' });
  }
  for (const b of branches) {
    if (!seen.has(b.processId)) {
      seen.add(b.processId);
      nodes.push({ id: b.processId, label: b.label ?? b.processId, kind: 'process' });
    }
  }

  const edges: ProcessEdge[] = [];
  for (let i = 0; i < mainFlow.length - 1; i++) {
    edges.push({
      id: `flow_${mainFlow[i]}__${mainFlow[i + 1]}`,
      from: mainFlow[i],
      to: mainFlow[i + 1],
      kind: 'flow',
    });
  }

  const mainSet = new Set(mainFlow);
  for (const b of branches) {
    if (mainSet.has(b.processId)) {
      // Feedback: a mainFlow tile that also appears as a branch source.
      edges.push({
        id: `feedback_${b.processId}__${b.connectsTo}`,
        from: b.processId,
        to: b.connectsTo,
        kind: 'feedback',
        label: b.label,
      });
    } else {
      // Side branch: parent -> branch with a recycle return.
      edges.push({
        id: `flow_${b.connectsTo}__${b.processId}`,
        from: b.connectsTo,
        to: b.processId,
        kind: 'flow',
        label: b.label,
      });
    }
  }

  return { nodes, edges };
}

/**
 * Returns the set of edge IDs that form back-edges in a DFS traversal.
 * Back-edges are the loop-closing edges in any directed cycle, including
 * self-loops. Used to retag forward `flow` edges as `feedback`/`recycle`
 * when they actually close a loop.
 */
export function detectCycles(edges: Iterable<ProcessEdge>): Set<string> {
  const adj = new Map<string, ProcessEdge[]>();
  for (const e of edges) {
    if (!adj.has(e.from)) adj.set(e.from, []);
    adj.get(e.from)!.push(e);
  }

  const WHITE = 0;
  const GRAY = 1;
  const BLACK = 2;
  const color = new Map<string, number>();
  const backEdges = new Set<string>();

  function dfs(node: string): void {
    color.set(node, GRAY);
    for (const edge of adj.get(node) ?? []) {
      const next = edge.to;
      const c = color.get(next) ?? WHITE;
      if (c === GRAY || next === node) {
        backEdges.add(edge.id);
      } else if (c === WHITE) {
        dfs(next);
      }
    }
    color.set(node, BLACK);
  }

  for (const start of adj.keys()) {
    if ((color.get(start) ?? WHITE) === WHITE) dfs(start);
  }
  return backEdges;
}

/**
 * Retags edges so that any forward `flow` edge that actually closes a
 * cycle becomes a `recycle` edge. `feedback`/`bypass`/`drain`/`sensor`
 * are left as-authored.
 */
export function classifyEdges(edges: ProcessEdge[]): ProcessEdge[] {
  const backEdges = detectCycles(edges);
  return edges.map((e) => {
    if (e.kind === 'flow' && backEdges.has(e.id)) {
      return { ...e, kind: 'recycle' as EdgeKind };
    }
    return e;
  });
}

/**
 * Computes the longest simple path in the graph and returns it as a
 * legacy `mainFlow`. Used so the linear renderer still has a sensible
 * trunk to draw when the graph view is the source of truth.
 */
export function longestPath(nodes: ProcessNode[], edges: ProcessEdge[]): string[] {
  const processNodes = new Set(
    nodes.filter((n) => n.kind === 'process').map((n) => n.id),
  );
  const forwardAdj = new Map<string, string[]>();
  for (const e of edges) {
    if (e.kind === 'feedback' || e.kind === 'recycle' || e.kind === 'sensor') continue;
    if (!processNodes.has(e.from) || !processNodes.has(e.to)) continue;
    if (!forwardAdj.has(e.from)) forwardAdj.set(e.from, []);
    forwardAdj.get(e.from)!.push(e.to);
  }

  const indegree = new Map<string, number>();
  for (const id of processNodes) indegree.set(id, 0);
  for (const [, targets] of forwardAdj) {
    for (const t of targets) {
      if (processNodes.has(t)) indegree.set(t, (indegree.get(t) ?? 0) + 1);
    }
  }

  let best: string[] = [];
  const visited = new Set<string>();

  function dfs(node: string, path: string[]): void {
    if (visited.has(node)) return;
    visited.add(node);
    path.push(node);
    const next = forwardAdj.get(node) ?? [];
    if (next.length === 0) {
      if (path.length > best.length) best = [...path];
    } else {
      for (const n of next) {
        if (!path.includes(n)) dfs(n, path);
      }
    }
    path.pop();
    visited.delete(node);
  }

  // Roots: indegree 0; if there are no roots (pure cycle), start from any node.
  const roots = [...processNodes].filter((id) => (indegree.get(id) ?? 0) === 0);
  const starts = roots.length > 0 ? roots : [...processNodes];
  for (const s of starts) dfs(s, []);
  return best;
}
