import { expect, test } from 'vitest';
import { isValidPathPattern, matchesPathPattern } from './pathPattern';

test.each([
  ['services/payment/**', 'services/payment/api/schema.json', true],
  ['services/payment/**', 'services/payment', true],
  ['services/payment/**', 'services/payments/api.ts', false],
  ['services/payment/**', 'other/services/payment/api.ts', false],
  ['**/schema.json', 'schema.json', true],
  ['**/schema.json', 'a/b/schema.json', true],
  ['**/schema.json', 'a/b/schema.yml', false],
  ['docs/*.md', 'docs/guide.md', true],
  ['docs/*.md', 'docs/nested/guide.md', false],
  ['README.md', 'README.md', true],
  ['README.md', 'READMEXmd', false],
  ['a+b/(c)/**', 'a+b/(c)/d.ts', true],
  ['services/**/api/*.ts', 'services/payment/v1/api/client.ts', true],
  ['services/**/api/*.ts', 'services/api/client.ts', true],
  ['services/**/api/*.ts', 'services/api/v1/client.ts', false],
  ['**', 'any/depth/at/all.ts', true],
  ['*', 'top-level.ts', true],
  ['*', 'nested/file.ts', false],
  ['*.ts', 'a.b.ts', true],
  ['a*c', 'abbbc', true],
  ['a*c', 'abbbd', false],
  ['a*b*c', 'axbyc', true],
  ['a*b*c', 'acb', false],
  ['*.ts', '.ts', true],
  ['services/payment/', 'services/payment', false],
])('%s against %s is %s', (pattern, path, expected) => {
  expect(matchesPathPattern(pattern, path)).toBe(expected);
});

test.each([
  ['many wildcards in one segment', '*a*a*a*a*a*a*a*a*a*a*a*a*a*a*a*a', `${'a'.repeat(5000)}b`],
  ['many double wildcards', Array(50).fill('**').join('/'), Array(1000).fill('a').join('/')],
])('stays fast with %s', (_name, pattern, path) => {
  const started = performance.now();

  matchesPathPattern(pattern, path);

  expect(performance.now() - started).toBeLessThan(1000);
});

test.each([
  ['an empty pattern', ''],
  ['an absolute path', '/services/**'],
  ['a parent directory', 'services/../secrets'],
  ['an overlong pattern', 'a'.repeat(201)],
])('rejects %s', (_name, pattern) => {
  expect(isValidPathPattern(pattern)).toBe(false);
});

test('accepts ordinary patterns', () => {
  expect(isValidPathPattern('services/payment/**')).toBe(true);
});
