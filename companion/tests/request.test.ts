import { expect, test } from 'vitest';
import { EXCERPT_LENGTH, MAX_ITEMS, parseReadRequest, toExcerpt } from '../src/request';

const parse = (value: unknown) => parseReadRequest(JSON.stringify(value));

test('accepts keys and page ids, removing duplicates', () => {
  expect(parse({ jira: ['KAN-4', 'KAN-4'], confluence: ['98307'] })).toEqual({
    jira: ['KAN-4'],
    confluence: ['98307'],
  });
});

test('treats missing lists as empty, which also tests a connection', () => {
  expect(parse({})).toEqual({ jira: [], confluence: [] });
});

test.each([
  ['a non-string body', 7],
  ['a body that is not JSON', '{ nope'],
])('rejects %s', (_name, body) => {
  expect(parseReadRequest(body)).toBeNull();
});

test.each([
  ['a JSON value that is not an object', null],
  ['a list that is not a list', { jira: 'KAN-4' }],
  ['a path in a key', { jira: ['../admin'] }],
  ['a lowercase key', { jira: ['kan-4'] }],
  ['a key with a query', { jira: ['KAN-4?expand=all'] }],
  ['a page id with a path', { confluence: ['1/../2'] }],
  ['a non-string item', { confluence: [7] }],
  ['too many items', { jira: Array.from({ length: MAX_ITEMS + 1 }, (_, index) => `KAN-${index + 1}`) }],
])('rejects %s', (_name, value) => {
  expect(parse(value)).toBeNull();
});

test('reduces markup to plain text', () => {
  expect(toExcerpt('<p local-id="1">One&nbsp;two</p>\n<p>three</p>')).toBe('One two three');
});

test('limits the excerpt length', () => {
  expect(toExcerpt(`<p>${'a'.repeat(EXCERPT_LENGTH * 3)}</p>`)).toHaveLength(EXCERPT_LENGTH);
});

test.each([
  ['a missing body', undefined],
  ['markup with no text', '<p></p>'],
])('returns no excerpt for %s', (_name, storage) => {
  expect(toExcerpt(storage)).toBeNull();
});
