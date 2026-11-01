import { expect, test } from 'vitest';
import { computeImpact, type ChangedPath, type ImpactResult } from './impact';
import type { Dependency, Service, ServiceMap } from './serviceMap';

const service = (id: string, paths = [`services/${id}/**`]): Service => ({
  id,
  name: id,
  owner: null,
  paths,
});

const dependsOn = (from: string, to: string): Dependency => ({
  from,
  to,
  type: 'depends_on',
  note: null,
});

const serviceMap = (services: Service[], dependencies: Dependency[] = []): ServiceMap => ({
  version: 1,
  services,
  dependencies,
});

const file = (path: string, previousPath: string | null = null): ChangedPath => ({
  path,
  previousPath,
});

const changedIds = ({ changed }: ImpactResult) => changed.map(({ service: { id } }) => id);

const routes = ({ affected }: ImpactResult) =>
  affected.map(({ route }) => route.map(({ id }) => id).join(' -> '));

const NORTHSTAR = serviceMap(
  [service('payment'), service('checkout'), service('billing'), service('partner')],
  [dependsOn('checkout', 'payment'), dependsOn('billing', 'payment'), dependsOn('partner', 'billing')]
);

test('reports the changed service and its files', () => {
  const result = computeImpact(NORTHSTAR, [file('services/payment/a.ts'), file('services/payment/b.ts')]);

  expect(result.changed).toEqual([{
    service: NORTHSTAR.services[0],
    files: ['services/payment/a.ts', 'services/payment/b.ts'],
  }]);
});

test('finds direct and transitive dependents, nearest first, with routes', () => {
  expect(routes(computeImpact(NORTHSTAR, [file('services/payment/a.ts')]))).toEqual([
    'billing -> payment',
    'checkout -> payment',
    'partner -> billing -> payment',
  ]);
});

test('walks dependencies in reverse, not forward', () => {
  const result = computeImpact(NORTHSTAR, [file('services/checkout/a.ts')]);

  expect(changedIds(result)).toEqual(['checkout']);
  expect(result.affected).toEqual([]);
});

test('a dependency cycle terminates and reports each service once', () => {
  const map = serviceMap(
    [service('a'), service('b'), service('c')],
    [dependsOn('a', 'b'), dependsOn('b', 'c'), dependsOn('c', 'a')]
  );

  expect(routes(computeImpact(map, [file('services/a/x.ts')]))).toEqual([
    'c -> a',
    'b -> c -> a',
  ]);
});

test('a diamond keeps the shortest route', () => {
  const map = serviceMap(
    [service('a'), service('b'), service('c'), service('d')],
    [dependsOn('b', 'a'), dependsOn('c', 'b'), dependsOn('d', 'a'), dependsOn('c', 'd')]
  );

  const { affected } = computeImpact(map, [file('services/a/x.ts')]);

  expect(affected.filter(({ service: { id } }) => id === 'c')).toHaveLength(1);
  expect(affected.at(-1)?.route).toHaveLength(3);
});

test('a changed service is not also listed as downstream', () => {
  const result = computeImpact(NORTHSTAR, [file('services/payment/a.ts'), file('services/checkout/a.ts')]);

  expect(changedIds(result).sort()).toEqual(['checkout', 'payment']);
  expect(routes(result)).not.toContain('checkout -> payment');
});

test('changed files no service claims are unmapped, not ignored', () => {
  const result = computeImpact(NORTHSTAR, [file('README.md'), file('services/payment/a.ts')]);

  expect(result.unmapped).toEqual(['README.md']);
});

test('no matching files gives no affected services and keeps files unmapped', () => {
  const result = computeImpact(NORTHSTAR, [file('README.md')]);

  expect(result.changed).toEqual([]);
  expect(result.affected).toEqual([]);
  expect(result.unmapped).toEqual(['README.md']);
});

test('a file claimed by two services counts for both', () => {
  const map = serviceMap([service('a', ['shared/**']), service('b', ['shared/**'])]);

  expect(changedIds(computeImpact(map, [file('shared/x.ts')]))).toEqual(['a', 'b']);
});

test('a rename out of a service still counts for it', () => {
  const result = computeImpact(NORTHSTAR, [file('archive/a.ts', 'services/payment/a.ts')]);

  expect(changedIds(result)).toEqual(['payment']);
  expect(result.unmapped).toEqual([]);
});

test('a large chain stays fast and complete', () => {
  const count = 500;
  const services = Array.from({ length: count }, (_, index) => service(`s${index}`));
  const dependencies = services.slice(1).map((_, index) => dependsOn(`s${index + 1}`, `s${index}`));

  const { affected } = computeImpact(serviceMap(services, dependencies), [file('services/s0/x.ts')]);

  expect(affected).toHaveLength(count - 1);
});
