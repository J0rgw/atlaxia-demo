import { describe, it, expect } from 'vitest';
import {
  classifyEdges,
  detectCycles,
  fromLegacy,
  longestPath,
  toGraph,
} from './processGraph';
import type { ProcessEdge, ProcessNode, ProcessTopology } from '@/types/installation';

const E = (id: string, from: string, to: string, kind: ProcessEdge['kind'] = 'flow'): ProcessEdge => ({
  id, from, to, kind,
});
const N = (id: string, kind: ProcessNode['kind'] = 'process'): ProcessNode => ({ id, label: id, kind });

describe('detectCycles', () => {
  it('returns empty set on an acyclic chain', () => {
    const edges = [E('e1', 'a', 'b'), E('e2', 'b', 'c'), E('e3', 'c', 'd')];
    expect(detectCycles(edges).size).toBe(0);
  });

  it('flags the back-edge in a simple loop', () => {
    const edges = [E('e1', 'a', 'b'), E('e2', 'b', 'c'), E('e3', 'c', 'a')];
    const back = detectCycles(edges);
    expect(back.has('e3')).toBe(true);
    expect(back.size).toBe(1);
  });

  it('flags a self-loop', () => {
    const edges = [E('self', 'a', 'a')];
    expect(detectCycles(edges).has('self')).toBe(true);
  });

  it('handles the Backwash→UF recycle pattern', () => {
    const edges = [
      E('e1', 'intake', 'dosing'),
      E('e2', 'dosing', 'uf'),
      E('e3', 'uf', 'uv'),
      E('e4', 'uf', 'backwash'),     // UF → Backwash (side branch)
      E('e5', 'backwash', 'uf'),     // Backwash → UF (recycle)
    ];
    const back = detectCycles(edges);
    expect(back.has('e5')).toBe(true);
  });
});

describe('classifyEdges', () => {
  it('retags back-edges from flow → recycle', () => {
    const edges = [
      E('e1', 'a', 'b'),
      E('e2', 'b', 'a'),
    ];
    const out = classifyEdges(edges);
    expect(out.find((e) => e.id === 'e1')!.kind).toBe('flow');
    expect(out.find((e) => e.id === 'e2')!.kind).toBe('recycle');
  });

  it('leaves authored feedback/bypass/drain/sensor alone', () => {
    const edges = [E('e1', 'a', 'b', 'feedback'), E('e2', 'a', 'c', 'bypass')];
    const out = classifyEdges(edges);
    expect(out[0].kind).toBe('feedback');
    expect(out[1].kind).toBe('bypass');
  });
});

describe('fromLegacy', () => {
  it('builds a chain of flow edges from mainFlow', () => {
    const g = fromLegacy(['a', 'b', 'c'], []);
    expect(g.nodes.map((n) => n.id)).toEqual(['a', 'b', 'c']);
    expect(g.edges).toHaveLength(2);
    expect(g.edges.every((e) => e.kind === 'flow')).toBe(true);
  });

  it('emits side-branch edges with the parent as source', () => {
    const g = fromLegacy(
      ['a', 'b'],
      [{ processId: 'side', connectsTo: 'b', label: 'Side' }],
    );
    expect(g.nodes.map((n) => n.id)).toContain('side');
    const branchEdge = g.edges.find((e) => e.to === 'side');
    expect(branchEdge?.from).toBe('b');
  });

  it('emits feedback edges when branch.processId is on mainFlow', () => {
    const g = fromLegacy(
      ['a', 'b', 'c'],
      [{ processId: 'c', connectsTo: 'a', label: 'Feedback' }],
    );
    const fb = g.edges.find((e) => e.kind === 'feedback');
    expect(fb).toBeDefined();
    expect(fb!.from).toBe('c');
    expect(fb!.to).toBe('a');
  });
});

describe('toGraph', () => {
  it('uses the embedded graph when present', () => {
    const topology: ProcessTopology = {
      mainFlow: ['a', 'b'],
      branches: [],
      nodes: [N('a'), N('b'), N('source', 'source')],
      edges: [E('e1', 'source', 'a'), E('e2', 'a', 'b')],
    };
    const g = toGraph(topology);
    expect(g.nodes.find((n) => n.id === 'source')).toBeDefined();
    expect(g.edges).toHaveLength(2);
  });

  it('falls back to legacy synthesis when no graph data', () => {
    const topology: ProcessTopology = {
      mainFlow: ['x', 'y', 'z'],
      branches: [{ processId: 'side', connectsTo: 'y' }],
    };
    const g = toGraph(topology);
    expect(g.nodes).toHaveLength(4);
    expect(g.edges.length).toBeGreaterThan(0);
  });

  it('normalizes legacy `from_` keys produced by pre-fix backend builds', () => {
    // Older backends serialized ProcessEdge.from_ without the alias, so
    // persisted JSONB has `from_` instead of `from`. Defensive parsing
    // should still produce valid edges for these stored configs.
    const topology = {
      mainFlow: ['a', 'b'],
      branches: [],
      nodes: [N('a'), N('b')],
      edges: [{ id: 'e1', from_: 'a', to: 'b', kind: 'flow' }],
    } as unknown as ProcessTopology;
    const g = toGraph(topology);
    expect(g.edges).toHaveLength(1);
    expect(g.edges[0].from).toBe('a');
    expect(g.edges[0].to).toBe('b');
  });

  it('drops edges with neither `from` nor `from_`', () => {
    const topology = {
      mainFlow: ['a', 'b'],
      branches: [],
      nodes: [N('a'), N('b')],
      edges: [{ id: 'orphan', to: 'b', kind: 'flow' }],
    } as unknown as ProcessTopology;
    expect(toGraph(topology).edges).toHaveLength(0);
  });
});

describe('longestPath', () => {
  it('returns the canonical chain on a linear plant', () => {
    const nodes = ['a', 'b', 'c', 'd'].map((id) => N(id));
    const edges = [E('e1', 'a', 'b'), E('e2', 'b', 'c'), E('e3', 'c', 'd')];
    expect(longestPath(nodes, edges)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('ignores feedback edges when picking the trunk', () => {
    const nodes = ['a', 'b', 'c'].map((id) => N(id));
    const edges = [
      E('e1', 'a', 'b'),
      E('e2', 'b', 'c'),
      E('e3', 'c', 'a', 'feedback'),
    ];
    expect(longestPath(nodes, edges)).toEqual(['a', 'b', 'c']);
  });

  it('handles a split: picks one of the longest branches', () => {
    const nodes = ['a', 'b', 'c1', 'c2', 'd'].map((id) => N(id));
    const edges = [
      E('e1', 'a', 'b'),
      E('e2', 'b', 'c1'),
      E('e3', 'b', 'c2'),
      E('e4', 'c1', 'd'),
    ];
    const trunk = longestPath(nodes, edges);
    expect(trunk).toEqual(['a', 'b', 'c1', 'd']);
  });
});
