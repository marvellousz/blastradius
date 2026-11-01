import { expect, test } from 'vitest';
import type { ContractResult, ContractStatus } from './contract';
import { MAX_GRAPH_SERVICES, buildImpactGraph } from './impactGraph';
import type { ImpactResult } from './impact';
import type { Service } from './serviceMap';

const service = (id: string): Service => ({
  id,
  name: `${id} name`,
  owner: `${id} team`,
  paths: [`${id}/**`],
  references: [],
});

const PAYMENT = service('payment');
const BILLING = service('billing');
const CHECKOUT = service('checkout');
const PARTNER = service('partner');

const IMPACT: ImpactResult = {
  changed: [{ service: PAYMENT, files: ['a.ts'] }],
  affected: [
    { service: BILLING, route: [BILLING, PAYMENT] },
    { service: CHECKOUT, route: [CHECKOUT, PAYMENT] },
    { service: PARTNER, route: [PARTNER, BILLING, PAYMENT] },
  ],
  unmapped: [],
};

const result = (consumer: Service, status: ContractStatus): ContractResult => ({
  consumer,
  provider: PAYMENT,
  contract: { file: 'a.json', fields: ['a'], verification: null },
  status,
  changes: [],
  reason: null,
});

test('places services by distance from the change', () => {
  const { nodes } = buildImpactGraph(IMPACT, []);

  expect(nodes.map(({ id, column, row }) => [id, column, row])).toEqual([
    ['payment', 0, 0],
    ['billing', 1, 0],
    ['checkout', 1, 1],
    ['partner', 2, 0],
  ]);
});

test('edges follow the direction impact travels', () => {
  expect(buildImpactGraph(IMPACT, []).edges.map(({ source, target }) => [source, target])).toEqual([
    ['payment', 'billing'],
    ['payment', 'checkout'],
    ['billing', 'partner'],
  ]);
});

test('keeps the route and owner for each service', () => {
  expect(buildImpactGraph(IMPACT, []).nodes.at(-1)).toMatchObject({
    owner: 'partner team',
    route: ['partner name', 'billing name', 'payment name'],
  });
});

test('colours services by their contract result, leaving clear ones downstream', () => {
  const { nodes } = buildImpactGraph(IMPACT, [
    result(CHECKOUT, 'breaking'),
    result(BILLING, 'clear'),
    result(PARTNER, 'review'),
  ]);

  expect(Object.fromEntries(nodes.map(({ id, kind }) => [id, kind]))).toEqual({
    payment: 'changed',
    checkout: 'breaking',
    billing: 'downstream',
    partner: 'review',
  });
});

test('the worst of several contracts decides', () => {
  const { nodes } = buildImpactGraph(IMPACT, [result(CHECKOUT, 'review'), result(CHECKOUT, 'breaking')]);

  expect(nodes.find(({ id }) => id === 'checkout')?.kind).toBe('breaking');
});

test('an unknown contract stays unknown', () => {
  const { nodes } = buildImpactGraph(IMPACT, [result(CHECKOUT, 'unknown')]);

  expect(nodes.find(({ id }) => id === 'checkout')?.kind).toBe('unknown');
});

test('nothing changed gives an empty graph', () => {
  expect(buildImpactGraph({ changed: [], affected: [], unmapped: ['a'] }, [])).toEqual({
    nodes: [],
    edges: [],
    truncated: false,
  });
});

test('limits services, keeps changed ones, and never links to a hidden service', () => {
  // A chain makes every route run through earlier services.
  const chain = Array.from({ length: MAX_GRAPH_SERVICES + 5 }, (_, index) => service(`s${index}`));
  const impact: ImpactResult = {
    changed: [{ service: PAYMENT, files: [] }],
    affected: chain.map((dependent, index) => ({
      service: dependent,
      route: [...chain.slice(0, index + 1).reverse(), PAYMENT],
    })),
    unmapped: [],
  };

  const graph = buildImpactGraph(impact, []);
  const ids = new Set(graph.nodes.map(({ id }) => id));

  expect(graph.nodes).toHaveLength(MAX_GRAPH_SERVICES);
  expect(ids.has('payment')).toBe(true);
  expect(graph.truncated).toBe(true);
  expect(graph.edges.every(({ source, target }) => ids.has(source) && ids.has(target))).toBe(true);
});
