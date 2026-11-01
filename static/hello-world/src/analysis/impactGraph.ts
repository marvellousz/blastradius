import type { ContractResult } from './contract';
import type { ImpactResult } from './impact';
import type { Service } from './serviceMap';

// Pure logic with no Forge or React imports, so the backend can reuse it later.

// Large maps stay readable in the narrow panel. The lists always show everything.
export const MAX_GRAPH_SERVICES = 30;

export type GraphNodeKind = 'changed' | 'breaking' | 'review' | 'unknown' | 'downstream';

export interface GraphNode {
  id: string;
  name: string;
  owner: string | null;
  kind: GraphNodeKind;
  // Hops from a changed service, then position within that column.
  column: number;
  row: number;
  // Service names from this service to the change.
  route: string[];
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
}

export interface ImpactGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  // True when more services are affected than the graph shows.
  truncated: boolean;
}

// A consumer can have several contracts, so the worst result decides.
const RESULT_ORDER = ['breaking', 'review', 'unknown'] as const;

const contractKind = (service: Service, results: ContractResult[]): GraphNodeKind | null => {
  const statuses = results
    .filter(({ consumer }) => consumer.id === service.id)
    .map(({ status }) => status);

  return RESULT_ORDER.find((status) => statuses.includes(status)) ?? null;
};

/**
 * Lays out impact left to right, from each changed service to what depends on
 * it. Edges follow the direction impact travels, the reverse of `depends_on`.
 */
export const buildImpactGraph = (impact: ImpactResult, results: ContractResult[]): ImpactGraph => {
  const entries = [
    ...impact.changed.map(({ service }) => ({ service, route: [service], fallback: 'changed' as const })),
    ...impact.affected.map(({ service, route }) => ({ service, route, fallback: 'downstream' as const })),
  ];
  // Entries run nearest first, so everything on a shown route is shown too.
  const shown = entries.slice(0, MAX_GRAPH_SERVICES);
  const rowsByColumn = new Map<number, number>();

  const nodes = shown.map(({ service, route, fallback }): GraphNode => {
    const column = route.length - 1;
    const row = rowsByColumn.get(column) ?? 0;

    rowsByColumn.set(column, row + 1);

    return {
      id: service.id,
      name: service.name,
      owner: service.owner,
      kind: contractKind(service, results) ?? fallback,
      column,
      row,
      route: route.map(({ name }) => name),
    };
  });

  const edges = new Map<string, GraphEdge>();

  for (const { route } of shown) {
    route.slice(1).forEach((next, index) => {
      const source = next.id;
      const target = route[index]?.id;

      if (target) {
        const id = `${source}->${target}`;
        edges.set(id, { id, source, target });
      }
    });
  }

  return { nodes, edges: [...edges.values()], truncated: entries.length > shown.length };
};
