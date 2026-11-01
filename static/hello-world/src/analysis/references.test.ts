import { expect, test } from 'vitest';
import { findReferences, isConfluenceUrl } from './references';

const text = (overrides: Partial<Parameters<typeof findReferences>[0]> = {}) => ({
  title: 'Update checkout',
  sourceBranch: 'main-work',
  description: null,
  ...overrides,
});

test('finds a key in the title', () => {
  expect(findReferences(text({ title: 'KAN-4 Remove receiptUrl' })).keys).toEqual([
    { key: 'KAN-4', sources: ['title'] },
  ]);
});

test('finds a key in a branch name with a prefix and suffix', () => {
  expect(findReferences(text({ sourceBranch: 'feature/PAY-214-remove-url' })).keys).toEqual([
    { key: 'PAY-214', sources: ['branch'] },
  ]);
});

test('merges sources for the same key and counts it once per text', () => {
  const found = findReferences(text({
    title: 'KAN-4 and KAN-4',
    sourceBranch: 'KAN-4-fix',
    description: 'Fixes KAN-4',
  }));

  expect(found.keys).toEqual([{ key: 'KAN-4', sources: ['title', 'branch', 'description'] }]);
});

test('finds several keys, including ones with digits in the project', () => {
  const { keys } = findReferences(text({ title: 'AB2-1 and PAY-22' }));

  expect(keys.map(({ key }) => key)).toEqual(['AB2-1', 'PAY-22']);
});

test.each([
  ['lowercase text', 'kan-4'],
  ['a single letter project', 'A-1'],
  ['a zero item', 'KAN-0'],
  ['part of a longer word', 'XKAN-4x'],
  ['a version suffix', 'build-KAN-4'],
  ['an encoding name', 'Use UTF-8 here'],
  ['a hash name', 'Move to SHA-256'],
])('ignores %s', (_name, title) => {
  expect(findReferences(text({ title })).keys).toEqual([]);
});

test('finds Confluence links in the description only', () => {
  const link = 'https://acme.atlassian.net/wiki/spaces/ENG/pages/1/Contract';

  expect(findReferences(text({ title: link, description: 'No links here' })).confluenceLinks).toEqual([]);
  expect(findReferences(text({ description: `Contract: ${link}` })).confluenceLinks).toEqual([link]);
});

test('drops sentence punctuation after a link', () => {
  const link = 'https://acme.atlassian.net/wiki/x/1';

  expect(findReferences(text({ description: `See ${link}. Then ${link}, ok?` })).confluenceLinks)
    .toEqual([link]);
});

test('stops a link at surrounding markup', () => {
  const link = 'https://acme.atlassian.net/wiki/x/1';

  expect(findReferences(text({ description: `[Contract](${link})` })).confluenceLinks).toEqual([link]);
});

test('keeps each link once and ignores other sites', () => {
  const link = 'https://acme.atlassian.net/wiki/x/1';
  const description = `${link} ${link} https://example.com/wiki/x https://acme.atlassian.net/browse/KAN-1`;

  expect(findReferences(text({ description })).confluenceLinks).toEqual([link]);
});

test('limits how many references are returned', () => {
  const title = Array.from({ length: 30 }, (_, index) => `KAN-${index + 1}`).join(' ');

  expect(findReferences(text({ title })).keys).toHaveLength(20);
});

test('handles very long text quickly', () => {
  const started = performance.now();

  findReferences(text({ description: 'A-'.repeat(50000) }));

  expect(performance.now() - started).toBeLessThan(1000);
});

test.each([
  ['a normal page', 'https://acme.atlassian.net/wiki/x/1', true],
  ['plain http', 'http://acme.atlassian.net/wiki/x/1', false],
  ['a lookalike host', 'https://acme.atlassian.net.evil.example/wiki/x', false],
  ['text that is not a URL', 'not a url', false],
])('%s is judged correctly', (_name, url, expected) => {
  expect(isConfluenceUrl(url)).toBe(expected);
});
