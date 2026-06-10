/**
 * TopologyGraph Component
 * React Flow graph showing network topology with device nodes and alert edges.
 * Nodes are positioned using a layered layout grouped by device type.
 */

import { useCallback, useMemo, useEffect, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  type Node,
  type Edge,
  type NodeTypes,
  type NodeProps,
  ReactFlowProvider,
  useReactFlow,
  useNodesInitialized,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useNetworkTopology, type TopologyNode as APITopologyNode } from '@/hooks/useNetwork';

// --- Constants ---

const DEVICE_COLORS: Record<string, string> = {
  PLC: '#e879f9',
  Router: '#facc15',
  SCADA: '#ef4444',
  Switch: '#22d3ee',
  PC: '#3b82f6',
};

const ALERT_EDGE_COLORS: Record<string, string> = {
  Emergencia: '#ef4444',
  Alerta: '#facc15',
  Aviso: '#6b7280',
};

const DEVICE_LAYER_ORDER: Record<string, number> = {
  Router: 0,
  Switch: 1,
  SCADA: 2,
  PLC: 3,
  PC: 4,
};

// --- Custom Node ---

interface DeviceNodeData {
  label: string;
  deviceType: string;
  importance: string;
  isCritical: boolean;
  isAuthorized: boolean;
  ip: string | null;
  vendor: string | null;
  [key: string]: unknown;
}

const deviceHandleStyle = { background: 'transparent', border: 'none', width: 4, height: 4 };

function DeviceNode({ data }: NodeProps<Node<DeviceNodeData>>) {
  const { label, deviceType, isCritical, isAuthorized } = data;
  const color = DEVICE_COLORS[deviceType] ?? '#6b7280';

  return (
    <div
      className="flex flex-col items-center"
      style={{ minWidth: 60 }}
    >
      <Handle type="target" position={Position.Top} style={deviceHandleStyle} />

      {/* Node circle */}
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          background: color,
          border: isCritical
            ? '3px solid #ef4444'
            : !isAuthorized
              ? '2px dashed #f97316'
              : '2px solid transparent',
          boxShadow: isCritical ? '0 0 10px rgba(239, 68, 68, 0.5)' : undefined,
          transition: 'all 0.2s',
        }}
      />

      {/* Label */}
      <div
        className="text-center mt-1 max-w-[80px] truncate"
        style={{
          fontSize: 9,
          color: '#d1d5db',
          lineHeight: '12px',
        }}
      >
        {label}
      </div>

      {/* Device type badge */}
      <div
        style={{
          fontSize: 7,
          color: color,
          fontWeight: 600,
          opacity: 0.8,
        }}
      >
        {deviceType}
      </div>

      <Handle type="source" position={Position.Bottom} style={deviceHandleStyle} />
    </div>
  );
}

const nodeTypes: NodeTypes = {
  device: DeviceNode,
};

// --- Layout: group by device type in layers, spread horizontally ---

function computeTopologyLayout(apiNodes: APITopologyNode[]): Record<string, { x: number; y: number }> {
  const layers: Record<number, APITopologyNode[]> = {};

  for (const node of apiNodes) {
    const layer = DEVICE_LAYER_ORDER[node.deviceType] ?? 4;
    if (!layers[layer]) layers[layer] = [];
    layers[layer].push(node);
  }

  const positions: Record<string, { x: number; y: number }> = {};
  const layerGap = 140;
  const nodeGap = 130;

  const sortedLayers = Object.keys(layers)
    .map(Number)
    .sort((a, b) => a - b);

  sortedLayers.forEach((layerIdx, rowIdx) => {
    const nodesInLayer = layers[layerIdx];
    const totalWidth = (nodesInLayer.length - 1) * nodeGap;
    const startX = -totalWidth / 2;

    nodesInLayer.forEach((node, colIdx) => {
      positions[node.id] = {
        x: startX + colIdx * nodeGap,
        y: rowIdx * layerGap,
      };
    });
  });

  return positions;
}

// --- Inner component ---

function TopologyInner() {
  const { data } = useNetworkTopology();
  const { fitView } = useReactFlow();
  const nodesInitialized = useNodesInitialized();
  const [didFit, setDidFit] = useState(false);

  const { nodes, edges } = useMemo(() => {
    if (!data) return { nodes: [], edges: [] };

    const positions = computeTopologyLayout(data.nodes);
    const nodeIds = new Set(data.nodes.map((n) => n.id));

    const flowNodes: Node[] = data.nodes.map((n) => ({
      id: n.id,
      type: 'device',
      position: positions[n.id] ?? { x: 0, y: 0 },
      data: {
        label: n.label,
        deviceType: n.deviceType,
        importance: n.importance,
        isCritical: n.isCritical,
        isAuthorized: n.isAuthorized,
        ip: n.ip,
        vendor: n.vendor,
      },
    }));

    const flowEdges: Edge[] = data.edges
      .filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target))
      .map((e) => ({
        id: `${e.source}-${e.target}`,
        source: e.source,
        target: e.target,
        style: {
          stroke: ALERT_EDGE_COLORS[e.lastAlertType] ?? '#6b7280',
          strokeWidth: Math.min(Math.max(e.alertCount / 10, 0.8), 3),
        },
        animated: e.lastAlertType === 'Emergencia',
      }));

    return { nodes: flowNodes, edges: flowEdges };
  }, [data]);

  useEffect(() => {
    if (nodesInitialized && !didFit) {
      setTimeout(() => fitView({ padding: 0.1, duration: 300 }), 50);
      setDidFit(true);
    }
  }, [nodesInitialized, didFit, fitView]);

  const onInit = useCallback(() => {
    setTimeout(() => fitView({ padding: 0.1 }), 100);
  }, [fitView]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onInit={onInit}
      colorMode="dark"
      fitView
      fitViewOptions={{ padding: 0.1 }}
      proOptions={{ hideAttribution: true }}
      minZoom={0.2}
      maxZoom={3}
    >
      <Background gap={24} size={1} color="#27272a" />
      <Controls
        showInteractive={false}
        style={{ background: '#18181b', borderColor: '#3f3f46' }}
      />
      <MiniMap
        nodeColor={(node) => {
          const dt = (node.data as DeviceNodeData).deviceType;
          return DEVICE_COLORS[dt] ?? '#6b7280';
        }}
        maskColor="rgba(0,0,0,0.7)"
        style={{ background: '#09090b', borderColor: '#3f3f46' }}
      />
    </ReactFlow>
  );
}

// --- Exported component ---

export function TopologyGraph() {
  const { data, isLoading, error } = useNetworkTopology();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <svg className="animate-spin h-6 w-6 text-[var(--status-normal)]" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-[var(--status-critical)]">Error loading topology</p>
      </div>
    );
  }

  const stats = data?.stats;

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 overflow-hidden">
      {/* Stats bar */}
      {stats && (
        <div className="flex gap-6 px-4 py-2 border-b border-zinc-200 dark:border-zinc-700 text-sm">
          <span className="text-zinc-500 dark:text-zinc-400">
            Devices: <span className="font-semibold text-zinc-900 dark:text-zinc-100">{stats.totalDevices}</span>
          </span>
          <span className="text-zinc-500 dark:text-zinc-400">
            Authorized: <span className="font-semibold text-green-600">{stats.authorized}</span>
          </span>
          <span className="text-zinc-500 dark:text-zinc-400">
            Unauthorized: <span className="font-semibold text-[var(--status-warning)]">{stats.unauthorized}</span>
          </span>
          <span className="text-[var(--text-secondary)]">
            Critical: <span className="font-semibold text-[var(--status-critical)]">{stats.critical}</span>
          </span>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-4 px-4 py-1.5 border-b border-zinc-200 dark:border-zinc-700 text-xs text-zinc-500 dark:text-zinc-400">
        {Object.entries(DEVICE_COLORS).map(([type, color]) => (
          <span key={type} className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
            {type}
          </span>
        ))}
      </div>

      {/* Graph */}
      <div className="h-[500px] bg-zinc-950">
        <ReactFlowProvider>
          <TopologyInner />
        </ReactFlowProvider>
      </div>
    </div>
  );
}
