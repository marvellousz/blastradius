import { expect, test } from 'vitest';
import { MAX_DEPENDENCIES, MAX_SERVICES, parseServiceMap } from './serviceMap';

const service = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  name: `${id} service`,
  paths: [`services/${id}/**`],
  ...overrides,
});

const map = (overrides: Record<string, unknown> = {}) => ({
  version: 1,
  services: [service('payment', { owner: 'Payments Team' }), service('checkout')],
  dependencies: [{ from: 'checkout', to: 'payment', type: 'depends_on', note: 'Reads responses' }],
  ...overrides,
});

const problemsOf = (source: unknown) => {
  const result = parseServiceMap(source);
  return result.valid ? [] : result.problems;
};

test('accepts a valid map and keeps missing owners and notes unknown', () => {
  expect(parseServiceMap(map({
    dependencies: [{ from: 'checkout', to: 'payment', type: 'depends_on' }],
  }))).toEqual({
    valid: true,
    map: {
      version: 1,
      services: [
        { id: 'payment', name: 'payment service', owner: 'Payments Team', paths: ['services/payment/**'] },
        { id: 'checkout', name: 'checkout service', owner: null, paths: ['services/checkout/**'] },
      ],
      dependencies: [{ from: 'checkout', to: 'payment', type: 'depends_on', note: null, contract: null }],
    },
  });
});

const withContract = (contract: unknown) => map({
  dependencies: [{ from: 'checkout', to: 'payment', type: 'depends_on', contract }],
});

test('accepts a contract and keeps a missing verification unknown', () => {
  const result = parseServiceMap(withContract({ file: 'services/payment/schema.json', fields: ['customer.id'] }));

  expect(result).toMatchObject({
    valid: true,
    map: {
      dependencies: [{
        contract: { file: 'services/payment/schema.json', fields: ['customer.id'], verification: null },
      }],
    },
  });
});

test.each([
  ['a wildcard file', { file: 'services/**', fields: ['a'] }, 'invalid file'],
  ['a traversal file', { file: '../secrets.json', fields: ['a'] }, 'invalid file'],
  ['a missing file', { fields: ['a'] }, 'invalid file'],
  ['no fields', { file: 'a.json', fields: [] }, 'fields'],
  ['too many fields', { file: 'a.json', fields: Array(101).fill('a') }, 'fields'],
  ['an invalid field', { file: 'a.json', fields: ['a..b'] }, 'invalid field'],
  ['a non-string field', { file: 'a.json', fields: [7] }, 'invalid field'],
  ['an invalid verification', { file: 'a.json', fields: ['a'], verification: 7 }, 'verification'],
])('rejects a contract with %s', (_name, contract, problem) => {
  expect(problemsOf(withContract(contract)).join(' ')).toContain(problem);
});

test('accepts a map with dependency cycles', () => {
  expect(parseServiceMap(map({
    dependencies: [
      { from: 'checkout', to: 'payment', type: 'depends_on' },
      { from: 'payment', to: 'checkout', type: 'depends_on' },
    ],
  })).valid).toBe(true);
});

test.each([
  ['a non-object', null, 'version'],
  ['an unsupported version', map({ version: 2 }), 'version'],
  ['missing services', map({ services: undefined }), '"services"'],
  ['missing dependencies', map({ dependencies: undefined }), '"dependencies"'],
  ['too many services', map({ services: Array(MAX_SERVICES + 1).fill(service('a')) }), '"services"'],
  ['too many dependencies', map({ dependencies: Array(MAX_DEPENDENCIES + 1).fill({}) }), '"dependencies"'],
  ['an invalid id', map({ services: [service('Bad Id')] }), 'invalid id'],
  ['a missing name', map({ services: [service('a', { name: undefined })] }), 'invalid name'],
  ['an overlong name', map({ services: [service('a', { name: 'x'.repeat(201) })] }), 'invalid name'],
  ['a non-string owner', map({ services: [service('a', { owner: 7 })] }), 'invalid owner'],
  ['no paths', map({ services: [service('a', { paths: [] })] }), 'paths'],
  ['too many paths', map({ services: [service('a', { paths: Array(51).fill('a/**') })] }), 'paths'],
  ['a non-string path', map({ services: [service('a', { paths: [7] })] }), 'path pattern'],
  ['an unsafe path', map({ services: [service('a', { paths: ['../secrets'] })] }), 'path pattern'],
  ['duplicate ids', map({ services: [service('a'), service('a')], dependencies: [] }), 'unique'],
  ['an unknown type', map({ dependencies: [{ from: 'checkout', to: 'payment', type: 'calls' }] }), 'depends_on'],
  ['an unknown from', map({ dependencies: [{ from: 'x', to: 'payment', type: 'depends_on' }] }), '"from"'],
  ['an unknown to', map({ dependencies: [{ from: 'checkout', to: 'x', type: 'depends_on' }] }), '"to"'],
  ['a self dependency', map({ dependencies: [{ from: 'payment', to: 'payment', type: 'depends_on' }] }), 'itself'],
  ['a non-string note', map({
    dependencies: [{ from: 'checkout', to: 'payment', type: 'depends_on', note: 7 }],
  }), 'invalid note'],
])('rejects %s', (_name, source, problem) => {
  expect(problemsOf(source).join(' ')).toContain(problem);
});

test('one bad service rejects the whole map', () => {
  expect(parseServiceMap(map({ services: [service('good'), service('Bad Id')] })).valid).toBe(false);
});

test('limits how many problems are reported', () => {
  const services = Array.from({ length: 20 }, (_, index) => service(`Bad ${index}`));

  expect(problemsOf(map({ services }))).toHaveLength(5);
});
