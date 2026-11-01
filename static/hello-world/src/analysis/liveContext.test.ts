import { expect, test } from 'vitest';
import { parseLiveContext, parseLiveItems } from './liveContext';

test('reads items', () => {
  expect(parseLiveItems({
    jira: [{ key: 'KAN-4', found: true, title: 'A', status: 'To Do', extra: 'ignored' }],
    confluence: [{ id: '1', title: 'B', version: 2, excerpt: 'C' }],
  })).toEqual({
    jira: [{ key: 'KAN-4', title: 'A', status: 'To Do' }],
    confluence: [{ id: '1', title: 'B', version: 2, excerpt: 'C' }],
  });
});

test('keeps items that could not be read, with no title', () => {
  expect(parseLiveItems({ jira: [{ key: 'KAN-4', found: false }], confluence: [] })).toEqual({
    jira: [{ key: 'KAN-4', title: null, status: null }],
    confluence: [],
  });
});

test.each([
  ['a non-object', null],
  ['missing lists', {}],
  ['a non-list', { jira: 'x', confluence: [] }],
  ['an entry with no key', { jira: [{ title: 'A' }], confluence: [] }],
  ['an entry with no id', { jira: [], confluence: [{ title: 'A' }] }],
])('rejects %s', (_name, source) => {
  expect(parseLiveItems(source)).toBeNull();
});

test('reads each status', () => {
  expect(parseLiveContext({ status: 'not-connected' })).toEqual({ status: 'not-connected' });
  expect(parseLiveContext({ status: 'ok', jira: [], confluence: [] })).toEqual({
    status: 'ok',
    jira: [],
    confluence: [],
  });
});

test.each([
  ['anything else', { status: 'other' }],
  ['nothing', undefined],
  ['ok with bad items', { status: 'ok', jira: 'x', confluence: [] }],
])('treats %s as unavailable', (_name, source) => {
  expect(parseLiveContext(source)).toEqual({ status: 'unavailable' });
});
