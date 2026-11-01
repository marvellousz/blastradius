import { beforeEach, expect, test, vi } from 'vitest';
import type { ChangedPath } from './analysis/impact';
import type { ServiceMap } from './analysis/serviceMap';
import { MAX_CONTRACT_FILES, loadContractEvidence } from './contractEvidence';
import { FAILURE, PullRequestLoadError } from './pullRequest';
import { readRepositoryFile, type RepositoryFile } from './repositoryFile';

// The real Bridge throws on import outside a Forge iframe.
vi.mock('@forge/bridge', () => ({}));

vi.mock('./repositoryFile', () => ({ readRepositoryFile: vi.fn() }));

const mockRead = vi.mocked(readRepositoryFile);

const SOURCE = 'abc123def456';
const DESTINATION = 'def456abc123';
const FILE = 'services/payment/schema.json';

const service = (id: string) => ({ id, name: id, owner: null, paths: [`${id}/**`] });

const dependency = (from: string, fields: string[], file = FILE) => ({
  from,
  to: 'payment',
  type: 'depends_on' as const,
  note: null,
  contract: { file, fields, verification: null },
});

const MAP: ServiceMap = {
  version: 1,
  services: [service('payment'), service('checkout'), service('billing')],
  dependencies: [dependency('billing', ['id']), dependency('checkout', ['receiptUrl'])],
};

const changed = (path: string): ChangedPath[] => [{ path, previousPath: null }];

const found = (properties: Record<string, unknown>): RepositoryFile => ({
  status: 'found',
  text: JSON.stringify({ properties }),
});

const BEFORE = found({ id: { type: 'string' }, receiptUrl: { type: 'string' } });
const AFTER = found({ id: { type: 'string' } });

beforeEach(() => {
  mockRead.mockReset().mockImplementation(async (commit) => (commit === DESTINATION ? BEFORE : AFTER));
});

const load = (map: ServiceMap = MAP, files: ChangedPath[] = changed(FILE)) =>
  loadContractEvidence(map, files, SOURCE, DESTINATION);

test('compares the schema at the destination and source commits', async () => {
  await load();

  expect(mockRead).toHaveBeenCalledWith(DESTINATION, FILE);
  expect(mockRead).toHaveBeenCalledWith(SOURCE, FILE);
});

test('reads a schema shared by two consumers only once per commit', async () => {
  await load();

  expect(mockRead).toHaveBeenCalledTimes(2);
});

test('lists breaking results first, and clear results stay visible', async () => {
  const { results } = await load();

  expect(results.map(({ consumer, status }) => [consumer.id, status])).toEqual([
    ['checkout', 'breaking'],
    ['billing', 'clear'],
  ]);
});

test('reads nothing when no contract file changed', async () => {
  await expect(load(MAP, changed('README.md'))).resolves.toEqual({ results: [], truncated: false });
  expect(mockRead).not.toHaveBeenCalled();
});

test('a rename away from the contract file still counts as a change', async () => {
  const { results } = await load(MAP, [{ path: 'moved.json', previousPath: FILE }]);

  expect(results).toHaveLength(2);
});

test('dependencies without a contract are skipped', async () => {
  const map = { ...MAP, dependencies: [{ ...dependency('checkout', ['a']), contract: null }] };

  await expect(load(map)).resolves.toEqual({ results: [], truncated: false });
});

test('invalid JSON becomes an unknown result, not a failure', async () => {
  mockRead.mockResolvedValue({ status: 'found', text: '{ nope' });

  const { results } = await load();

  expect(results.every(({ status }) => status === 'unknown')).toBe(true);
});

test('an oversized schema becomes an unknown result', async () => {
  mockRead.mockResolvedValue({ status: 'too-large' });

  const { results } = await load();

  expect(results.every(({ status }) => status === 'unknown')).toBe(true);
});

test('a schema removed by the pull request is breaking', async () => {
  mockRead.mockImplementation(async (commit) => (
    commit === DESTINATION ? BEFORE : { status: 'missing' }
  ));

  const { results } = await load();

  expect(results[0]?.status).toBe('breaking');
});

test('an access failure rejects rather than hiding the contract', async () => {
  mockRead.mockRejectedValue(new PullRequestLoadError(FAILURE.DENIED));

  await expect(load()).rejects.toMatchObject({ kind: FAILURE.DENIED });
});

test('limits how many contract files are compared and says so', async () => {
  const files = Array.from({ length: MAX_CONTRACT_FILES + 2 }, (_, index) => `schemas/${index}.json`);
  const map = { ...MAP, dependencies: files.map((file) => dependency('checkout', ['id'], file)) };

  const result = await load(map, files.flatMap(changed));

  expect(result.results).toHaveLength(MAX_CONTRACT_FILES);
  expect(result.truncated).toBe(true);
});
