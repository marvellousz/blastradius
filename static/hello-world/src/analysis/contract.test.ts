import { expect, test } from 'vitest';
import { compareContract, type SchemaDocument } from './contract';
import type { Service } from './serviceMap';

const service = (id: string): Service => ({
  id,
  name: id,
  owner: null,
  paths: [`${id}/**`],
  references: [],
});

const schema = (
  properties: Record<string, unknown>,
  required: string[] = Object.keys(properties)
): SchemaDocument => ({ status: 'parsed', value: { type: 'object', required, properties } });

const STRING = { type: 'string' };

const compare = (before: SchemaDocument, after: SchemaDocument, fields = ['receiptUrl']) =>
  compareContract({
    consumer: service('checkout'),
    provider: service('payment'),
    contract: { file: 'schema.json', fields, verification: null },
    before,
    after,
  });

test('a removed declared field is breaking', () => {
  const result = compare(schema({ receiptUrl: STRING, id: STRING }), schema({ id: STRING }));

  expect(result.status).toBe('breaking');
  expect(result.changes).toEqual([{ field: 'receiptUrl', change: 'removed' }]);
});

test('a changed type is breaking', () => {
  const result = compare(schema({ receiptUrl: STRING }), schema({ receiptUrl: { type: 'number' } }));

  expect(result.status).toBe('breaking');
  expect(result.changes).toEqual([
    { field: 'receiptUrl', change: 'type-changed', before: 'string', after: 'number' },
  ]);
});

test('a field that stops being required needs review', () => {
  const result = compare(schema({ receiptUrl: STRING }), schema({ receiptUrl: STRING }, []));

  expect(result.status).toBe('review');
  expect(result.changes).toEqual([{ field: 'receiptUrl', change: 'now-optional' }]);
});

test('a field becoming required does not flag the consumer', () => {
  expect(compare(schema({ receiptUrl: STRING }, []), schema({ receiptUrl: STRING })).status).toBe('clear');
});

test('a change to an undeclared field stays clear', () => {
  const result = compare(schema({ receiptUrl: STRING, note: STRING }), schema({ receiptUrl: STRING }));

  expect(result.status).toBe('clear');
  expect(result.changes).toEqual([]);
});

test('compares nested fields by dotted path', () => {
  const before = schema({ customer: { type: 'object', properties: { id: STRING } } });
  const after = schema({ customer: { type: 'object', properties: {} } });

  expect(compare(before, after, ['customer.id']).changes).toEqual([{ field: 'customer.id', change: 'removed' }]);
});

test('compares fields inside array items', () => {
  const before = schema({ lines: { type: 'array', items: { properties: { sku: STRING } } } });
  const after = schema({ lines: { type: 'array', items: { properties: {} } } });

  expect(compare(before, after, ['lines.sku']).status).toBe('breaking');
});

test('compares union types regardless of order', () => {
  const before = schema({ receiptUrl: { type: ['string', 'null'] } });
  const after = schema({ receiptUrl: { type: ['null', 'string'] } });

  expect(compare(before, after).status).toBe('clear');
});

test('a declared field missing from the destination schema is unknown, not clear', () => {
  const result = compare(schema({ id: STRING }), schema({ id: STRING }));

  expect(result.status).toBe('unknown');
  expect(result.changes).toEqual([{ field: 'receiptUrl', change: 'not-in-schema' }]);
});

test('breaking outranks other changes for the same contract', () => {
  const result = compare(
    schema({ a: STRING, b: STRING }),
    schema({ b: STRING }, []),
    ['a', 'b', 'missing']
  );

  expect(result.status).toBe('breaking');
  expect(result.changes.map(({ change }) => change)).toEqual(['removed', 'now-optional', 'not-in-schema']);
});

test('removing the schema file breaks every declared field', () => {
  const result = compare(schema({ a: STRING, b: STRING }), { status: 'missing' }, ['a', 'b']);

  expect(result.status).toBe('breaking');
  expect(result.changes).toHaveLength(2);
});

const UNREADABLE_CASES: Array<[string, SchemaDocument, SchemaDocument, string]> = [
  ['no destination schema', { status: 'missing' }, schema({}), 'not on the destination branch'],
  ['an unreadable destination', { status: 'unreadable' }, schema({}), 'could not be read'],
  ['an unreadable source', schema({}), { status: 'unreadable' }, 'could not be read'],
];

test.each(UNREADABLE_CASES)('reports %s as unknown', (_name, before, after, reason) => {
  const result = compare(before, after);

  expect(result.status).toBe('unknown');
  expect(result.reason).toContain(reason);
});

test.each([
  ['$ref', { $ref: '#/definitions/payment' }],
  ['oneOf', { oneOf: [] }],
  ['allOf', { allOf: [] }],
  ['anyOf', { anyOf: [] }],
])('does not guess past %s', (_name, node) => {
  const result = compare(schema({ receiptUrl: STRING }), schema({ receiptUrl: node }));

  expect(result.status).toBe('unknown');
  expect(result.reason).toContain('cannot compare');
});

test('a non-object schema is unknown', () => {
  expect(compare({ status: 'parsed', value: 'text' }, schema({})).status).toBe('unknown');
});

test('a very deep schema is unknown, not a crash', () => {
  let node: Record<string, unknown> = { type: 'string' };
  for (let depth = 0; depth < 50; depth += 1) {
    node = { type: 'object', properties: { a: node } };
  }

  expect(compare({ status: 'parsed', value: node }, schema({})).reason).toContain('cannot compare');
});
