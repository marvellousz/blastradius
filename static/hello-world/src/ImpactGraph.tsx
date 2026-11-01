import { Controls, MarkerType, Position, ReactFlow, type Edge, type Node } from '@xyflow/react';
import { useMemo, useState } from 'react';
import type { ContractResult } from './analysis/contract';
import type { ImpactResult } from './analysis/impact';
import {
  MAX_GRAPH_SERVICES,
  buildImpactGraph,
  type GraphNode,
  type GraphNodeKind,
} from './analysis/impactGraph';

import '@xyflow/react/dist/style.css';
import './ImpactGraph.css';

const COLUMN_WIDTH = 280;
const ROW_HEIGHT = 96;
const MAX_HEIGHT = 420;

// Stated in words so colour is never the only signal.
const KIND_LABELS: Record<GraphNodeKind, string> = {
  changed: 'Changed',
  breaking: 'High severity',
  review: 'Medium severity',
  unknown: 'Unknown',
  downstream: 'Downstream',
};

const toFlowNode = (node: GraphNode): Node => ({
  id: node.id,
  position: { x: node.column * COLUMN_WIDTH, y: node.row * ROW_HEIGHT },
  data: { label: `${node.name} (${KIND_LABELS[node.kind]})` },
  className: `impact-node impact-node--${node.kind}`,
  sourcePosition: Position.Right,
  targetPosition: Position.Left,
  ariaLabel: `${node.name}, ${KIND_LABELS[node.kind]}`,
});

interface ImpactGraphProps {
  impact: ImpactResult;
  results: ContractResult[];
}

function ImpactGraph({ impact, results }: ImpactGraphProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { nodes, edges, truncated } = useMemo(() => buildImpactGraph(impact, results), [impact, results]);
  const flowNodes = useMemo(() => nodes.map(toFlowNode), [nodes]);
  const flowEdges = useMemo(
    (): Edge[] => edges.map((edge) => ({ ...edge, markerEnd: { type: MarkerType.ArrowClosed } })),
    [edges]
  );

  if (nodes.length === 0) {
    return null;
  }

  const rows = Math.max(...nodes.map(({ row }) => row)) + 1;
  const selected = nodes.find(({ id }) => id === selectedId);

  return (
    <section>
      <p>Impact graph</p>
      {truncated && (
        <p role="status">
          Showing the nearest {MAX_GRAPH_SERVICES} services. The lists below show all of them.
        </p>
      )}
      <div
        className="impact-graph"
        role="group"
        aria-label="Graph of affected services. The lists below show the same services."
        style={{ height: Math.min(MAX_HEIGHT, rows * ROW_HEIGHT + 96) }}
      >
        <ReactFlow
          nodes={flowNodes}
          edges={flowEdges}
          fitView
          nodesDraggable={false}
          nodesConnectable={false}
          // Keep the page scrolling when the pointer is over the graph.
          zoomOnScroll={false}
          preventScrolling={false}
          onNodeClick={(_event, node) => setSelectedId(node.id)}
        >
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
      {selected ? (
        <p>
          {selected.name}: {KIND_LABELS[selected.kind]}. Owner: {selected.owner ?? 'not configured'}.
          {' '}Route: {selected.route.join(' → ')}.
        </p>
      ) : (
        <p>Select a service for its owner and route.</p>
      )}
    </section>
  );
}

export default ImpactGraph;
