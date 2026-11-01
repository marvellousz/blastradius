import type { Node } from '@xyflow/react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import ImpactGraph from './ImpactGraph';
import type { ImpactResult } from './analysis/impact';
import { MAX_GRAPH_SERVICES } from './analysis/impactGraph';
import type { Service } from './analysis/serviceMap';

// React Flow needs real layout measurements, which jsdom cannot provide. This
// stand-in renders the nodes it receives and passes clicks through.
vi.mock('@xyflow/react', () => ({
  Controls: () => null,
  MarkerType: { ArrowClosed: 'arrowclosed' },
  Position: { Left: 'left', Right: 'right' },
  ReactFlow: ({ nodes, zoomOnScroll, nodesDraggable, onNodeClick }: {
    nodes: Node[];
    zoomOnScroll: boolean;
    nodesDraggable: boolean;
    onNodeClick: (event: unknown, node: Node) => void;
  }) => (
    <div data-zoom={String(zoomOnScroll)} data-drag={String(nodesDraggable)}>
      {nodes.map((node) => (
        <button key={node.id} className={node.className} onClick={(event) => onNodeClick(event, node)}>
          {String(node.data.label)}
        </button>
      ))}
    </div>
  ),
}));

const service = (id: string, owner: string | null = `${id} team`): Service => ({
  id,
  name: id,
  owner,
  paths: [`${id}/**`],
  references: [],
});

const PAYMENT = service('payment');
const CHECKOUT = service('checkout', null);

const IMPACT: ImpactResult = {
  changed: [{ service: PAYMENT, files: ['a.ts'] }],
  affected: [{ service: CHECKOUT, route: [CHECKOUT, PAYMENT] }],
  unmapped: [],
};

let container: HTMLDivElement;
let root: Root;

const renderGraph = async (impact: ImpactResult = IMPACT) => {
  await act(async () => {
    root.render(<ImpactGraph impact={impact} results={[]} />);
  });
};

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => {
    root.unmount();
  });
  container.remove();
});

test('renders nothing when no service is involved', async () => {
  await renderGraph({ changed: [], affected: [], unmapped: ['a'] });

  expect(container.textContent).toBe('');
});

test('states each node kind in words, not only colour', async () => {
  await renderGraph();

  expect(container.textContent).toContain('payment (Changed)');
  expect(container.textContent).toContain('checkout (Downstream)');
  expect(container.querySelector('button')?.className).toContain('impact-node--changed');
});

test('selecting a service shows its owner and route', async () => {
  await renderGraph();

  await act(async () => {
    container.querySelectorAll('button')[1]?.click();
  });

  expect(container.textContent).toContain('checkout: Downstream. Owner: not configured.');
  expect(container.textContent).toContain('Route: checkout → payment.');
});

test('leaves page scrolling alone and keeps the layout fixed', async () => {
  await renderGraph();

  const flow = container.querySelector('[data-zoom]');

  expect(flow?.getAttribute('data-zoom')).toBe('false');
  expect(flow?.getAttribute('data-drag')).toBe('false');
});

test('points to the lists as the accessible alternative', async () => {
  await renderGraph();

  expect(container.querySelector('[role="group"]')?.getAttribute('aria-label')).toContain('lists below');
});

test('says when the graph is limited', async () => {
  const dependents = Array.from({ length: MAX_GRAPH_SERVICES + 1 }, (_, index) => service(`s${index}`));

  await renderGraph({
    ...IMPACT,
    affected: dependents.map((dependent) => ({ service: dependent, route: [dependent, PAYMENT] })),
  });

  expect(container.querySelector('[role="status"]')?.textContent).toContain('The lists below show all');
});
