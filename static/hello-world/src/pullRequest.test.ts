import { requestBitbucket } from '@forge/bridge';
import { beforeEach, expect, test, vi } from 'vitest';
import { FAILURE, PullRequestLoadError, loadPullRequest } from './pullRequest';

// Typed as unknown so tests can supply malformed context, as a real host could.
const mockGetContext = vi.hoisted(() => vi.fn<() => Promise<unknown>>());

// The Bridge only works inside a Forge iframe, so tests replace it.
vi.mock('@forge/bridge', () => ({
  requestBitbucket: vi.fn(),
  view: { getContext: mockGetContext },
}));

const mockRequest = vi.mocked(requestBitbucket);

const WORKSPACE_UUID = '11111111-2222-3333-4444-555555555555';
const REPOSITORY_UUID = '{aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee}';
const EXPECTED_PATH = `/2.0/repositories/{${WORKSPACE_UUID}}/${REPOSITORY_UUID}/pullrequests/1`;

const context = (overrides: Record<string, unknown> = {}) => ({
  workspaceId: WORKSPACE_UUID,
  extension: { repository: { uuid: REPOSITORY_UUID }, pullRequest: { id: 1 } },
  ...overrides,
});

const pullRequestBody = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  title: 'Test BlastRadius panel',
  state: 'OPEN',
  author: { display_name: 'Pat Example' },
  source: { branch: { name: 'test-panel' }, commit: { hash: 'abc123def456' } },
  destination: { branch: { name: 'main' } },
  ...overrides,
});

const respondWith = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status });

const failureKindOf = (promise: Promise<unknown>) => promise.then(
  () => 'resolved',
  (error: unknown) => (error instanceof PullRequestLoadError ? error.kind : 'unexpected error')
);

beforeEach(() => {
  mockGetContext.mockReset().mockResolvedValue(context());
  mockRequest.mockReset().mockResolvedValue(respondWith(200, pullRequestBody()));
});

test('requests the pull request from the panel context and returns a summary', async () => {
  await expect(loadPullRequest()).resolves.toEqual({
    id: 1,
    title: 'Test BlastRadius panel',
    state: 'OPEN',
    author: 'Pat Example',
    sourceBranch: 'test-panel',
    destinationBranch: 'main',
    sourceCommit: 'abc123def456',
  });
  expect(mockRequest).toHaveBeenCalledWith(EXPECTED_PATH);
});

test('does not wrap a workspace UUID that already has braces', async () => {
  mockGetContext.mockResolvedValue(context({ workspaceId: `{${WORKSPACE_UUID}}` }));

  await loadPullRequest();

  expect(mockRequest).toHaveBeenCalledWith(EXPECTED_PATH);
});

test('keeps a missing author unknown', async () => {
  mockRequest.mockResolvedValue(respondWith(200, pullRequestBody({ author: null })));

  await expect(loadPullRequest()).resolves.toMatchObject({ author: null });
});

test.each([
  ['missing workspace', { workspaceId: undefined }],
  ['path traversal in workspace', { workspaceId: '../admin' }],
  ['non-string workspace', { workspaceId: 7 }],
  ['missing extension', { extension: undefined }],
  ['missing repository', { extension: { pullRequest: { id: 1 } } }],
  ['missing pull request', { extension: { repository: { uuid: REPOSITORY_UUID } } }],
  ['invalid pull request id', {
    extension: { repository: { uuid: REPOSITORY_UUID }, pullRequest: { id: '1/../2' } },
  }],
])('rejects %s without calling Bitbucket', async (_name, overrides) => {
  mockGetContext.mockResolvedValue(context(overrides));

  await expect(failureKindOf(loadPullRequest())).resolves.toBe(FAILURE.CONTEXT);
  expect(mockRequest).not.toHaveBeenCalled();
});

test.each([
  [401, FAILURE.DENIED],
  [403, FAILURE.DENIED],
  [404, FAILURE.NOT_FOUND],
  [429, FAILURE.RATE_LIMITED],
  [500, FAILURE.UNAVAILABLE],
])('maps HTTP %i to its failure category', async (status, kind) => {
  mockRequest.mockResolvedValue(respondWith(status, {}));

  await expect(failureKindOf(loadPullRequest())).resolves.toBe(kind);
});

test('reports a failed request as unavailable', async () => {
  mockRequest.mockRejectedValue(new Error('network down'));

  await expect(failureKindOf(loadPullRequest())).resolves.toBe(FAILURE.UNAVAILABLE);
});

test('reports an unreadable body as malformed', async () => {
  mockRequest.mockResolvedValue(new Response('not json', { status: 200 }));

  await expect(failureKindOf(loadPullRequest())).resolves.toBe(FAILURE.MALFORMED);
});

test.each([
  ['a null body', null],
  ['a missing title', pullRequestBody({ title: undefined })],
  ['a non-string state', pullRequestBody({ state: 7 })],
  ['a missing source commit', pullRequestBody({
    source: { branch: { name: 'test-panel' } },
  })],
  ['a missing destination branch', pullRequestBody({ destination: {} })],
  ['a different pull request id', pullRequestBody({ id: 2 })],
])('rejects %s as malformed', async (_name, body) => {
  mockRequest.mockResolvedValue(respondWith(200, body));

  await expect(failureKindOf(loadPullRequest())).resolves.toBe(FAILURE.MALFORMED);
});
