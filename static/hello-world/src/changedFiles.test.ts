import { requestBitbucket } from '@forge/bridge';
import { beforeEach, expect, test, vi } from 'vitest';
import { MAX_FILES, loadChangedFiles } from './changedFiles';
import { FAILURE, PullRequestLoadError } from './pullRequest';

const mockGetContext = vi.hoisted(() => vi.fn<() => Promise<unknown>>());

// The Bridge only works inside a Forge iframe, so tests replace it.
vi.mock('@forge/bridge', () => ({
  requestBitbucket: vi.fn(),
  view: { getContext: mockGetContext },
}));

const mockRequest = vi.mocked(requestBitbucket);

const REPOSITORY_UUID = '{aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee}';
const WORKSPACE_UUID = '{11111111-2222-3333-4444-555555555555}';
const BASE_PATH = `/2.0/repositories/${WORKSPACE_UUID}/${REPOSITORY_UUID}/pullrequests/1`;
const NEXT_URL = 'https://api.bitbucket.org/2.0/repositories/marvlock/repo/diffstat/a..b?page=2';
const NEXT_PATH = '/2.0/repositories/marvlock/repo/diffstat/a..b?page=2';

const entry = (path: string, overrides: Record<string, unknown> = {}) => ({
  status: 'modified',
  lines_added: 1,
  lines_removed: 2,
  old: { path },
  new: { path },
  ...overrides,
});

const entries = (count: number) => Array.from({ length: count }, (_, index) => entry(`file${index}.ts`));

const page = (values: unknown, next?: string) =>
  new Response(JSON.stringify({ values, next }), { status: 200 });

const failureKindOf = (promise: Promise<unknown>) => promise.then(
  () => 'resolved',
  (error: unknown) => (error instanceof PullRequestLoadError ? error.kind : 'unexpected error')
);

beforeEach(() => {
  mockGetContext.mockReset().mockResolvedValue({
    workspaceId: WORKSPACE_UUID,
    extension: { repository: { uuid: REPOSITORY_UUID }, pullRequest: { id: 1 } },
  });
  mockRequest.mockReset();
});

test('requests the bounded diffstat and normalizes each file', async () => {
  mockRequest.mockResolvedValue(page([entry('src/a.ts')]));

  await expect(loadChangedFiles()).resolves.toEqual({
    files: [{
      path: 'src/a.ts',
      previousPath: null,
      status: 'modified',
      linesAdded: 1,
      linesRemoved: 2,
    }],
    truncated: false,
  });
  expect(mockRequest).toHaveBeenCalledWith(`${BASE_PATH}/diffstat?pagelen=${MAX_FILES}`);
});

test('keeps the old path of a renamed file', async () => {
  mockRequest.mockResolvedValue(page([
    entry('src/new.ts', { status: 'renamed', old: { path: 'src/old.ts' } }),
  ]));

  await expect(loadChangedFiles()).resolves.toMatchObject({
    files: [{ path: 'src/new.ts', previousPath: 'src/old.ts' }],
  });
});

test('uses the old path for a removed file', async () => {
  mockRequest.mockResolvedValue(page([entry('src/gone.ts', { status: 'removed', new: null })]));

  await expect(loadChangedFiles()).resolves.toMatchObject({
    files: [{ path: 'src/gone.ts', status: 'removed', previousPath: null }],
  });
});

test('keeps missing line counts unknown', async () => {
  mockRequest.mockResolvedValue(page([
    entry('logo.png', { lines_added: null, lines_removed: undefined }),
  ]));

  await expect(loadChangedFiles()).resolves.toMatchObject({
    files: [{ linesAdded: null, linesRemoved: null }],
  });
});

test('follows next as a relative Bitbucket path', async () => {
  mockRequest.mockResolvedValueOnce(page(entries(2), NEXT_URL));
  mockRequest.mockResolvedValueOnce(page(entries(1)));

  const result = await loadChangedFiles();

  expect(mockRequest).toHaveBeenLastCalledWith(NEXT_PATH);
  expect(result).toMatchObject({ truncated: false });
  expect(result.files).toHaveLength(3);
});

test('stops at the file limit and reports truncation', async () => {
  mockRequest.mockResolvedValue(page(entries(MAX_FILES + 1)));

  const result = await loadChangedFiles();

  expect(result.files).toHaveLength(MAX_FILES);
  expect(result.truncated).toBe(true);
});

test('reports truncation when more files remain at the limit', async () => {
  mockRequest.mockResolvedValue(page(entries(MAX_FILES), NEXT_URL));

  const result = await loadChangedFiles();

  expect(mockRequest).toHaveBeenCalledTimes(1);
  expect(result.truncated).toBe(true);
});

test('stops at the page limit and reports truncation', async () => {
  mockRequest.mockImplementation(async () => page(entries(1), NEXT_URL));

  const result = await loadChangedFiles();

  expect(mockRequest).toHaveBeenCalledTimes(5);
  expect(result.files).toHaveLength(5);
  expect(result.truncated).toBe(true);
});

test('does not treat an empty pull request as truncated', async () => {
  mockRequest.mockResolvedValue(page([]));

  await expect(loadChangedFiles()).resolves.toEqual({ files: [], truncated: false });
});

test.each([
  ['another host', 'https://attacker.example/2.0/repositories/a/b/diffstat'],
  ['a lookalike host', 'https://api.bitbucket.org.attacker.example/2.0/repositories/a/b'],
  ['another Bitbucket path', 'https://api.bitbucket.org/2.0/user'],
  ['plain http', 'http://api.bitbucket.org/2.0/repositories/a/b/diffstat'],
  ['an unparseable link', 'not a url'],
])('rejects a next link to %s without following it', async (_name, next) => {
  mockRequest.mockResolvedValue(page(entries(1), next));

  await expect(failureKindOf(loadChangedFiles())).resolves.toBe(FAILURE.MALFORMED);
  expect(mockRequest).toHaveBeenCalledTimes(1);
});

test.each([
  ['values that are not a list', { values: 'nope' }],
  ['missing values', {}],
  ['an entry with no path', { values: [{ status: 'modified' }] }],
  ['an entry with no status', { values: [entry('a.ts', { status: undefined })] }],
  ['a negative line count', { values: [entry('a.ts', { lines_added: -1 })] }],
  ['a non-numeric line count', { values: [entry('a.ts', { lines_removed: 'many' })] }],
])('rejects %s as malformed', async (_name, body) => {
  mockRequest.mockResolvedValue(new Response(JSON.stringify(body), { status: 200 }));

  await expect(failureKindOf(loadChangedFiles())).resolves.toBe(FAILURE.MALFORMED);
});

test('rejects the whole list when a later page fails', async () => {
  mockRequest.mockResolvedValueOnce(page(entries(1), NEXT_URL));
  mockRequest.mockResolvedValueOnce(new Response('{}', { status: 403 }));

  await expect(failureKindOf(loadChangedFiles())).resolves.toBe(FAILURE.DENIED);
});

test('rejects a bad panel context without calling Bitbucket', async () => {
  mockGetContext.mockResolvedValue({});

  await expect(failureKindOf(loadChangedFiles())).resolves.toBe(FAILURE.CONTEXT);
  expect(mockRequest).not.toHaveBeenCalled();
});
