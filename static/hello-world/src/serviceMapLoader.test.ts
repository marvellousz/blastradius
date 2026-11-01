import { requestBitbucket } from '@forge/bridge';
import { beforeEach, expect, test, vi } from 'vitest';
import northstarMap from '../../../demo/northstar/blastradius.json?raw';
import { FAILURE, PullRequestLoadError } from './pullRequest';
import { loadServiceMap } from './serviceMapLoader';

const mockGetContext = vi.hoisted(() => vi.fn<() => Promise<unknown>>());

// The Bridge only works inside a Forge iframe, so tests replace it.
vi.mock('@forge/bridge', () => ({
  requestBitbucket: vi.fn(),
  view: { getContext: mockGetContext },
}));

const mockRequest = vi.mocked(requestBitbucket);

const WORKSPACE_UUID = '{11111111-2222-3333-4444-555555555555}';
const REPOSITORY_UUID = '{aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee}';
const COMMIT = 'def456abc123';

const VALID_MAP = JSON.stringify({
  version: 1,
  services: [{ id: 'payment', name: 'Payment Service', paths: ['services/payment/**'] }],
  dependencies: [],
});

const failureKindOf = (promise: Promise<unknown>) => promise.then(
  () => 'resolved',
  (error: unknown) => (error instanceof PullRequestLoadError ? error.kind : 'unexpected error')
);

beforeEach(() => {
  mockGetContext.mockReset().mockResolvedValue({
    workspaceId: WORKSPACE_UUID,
    extension: { repository: { uuid: REPOSITORY_UUID }, pullRequest: { id: 1 } },
  });
  mockRequest.mockReset().mockResolvedValue(new Response(VALID_MAP, { status: 200 }));
});

test('reads the map from the destination commit', async () => {
  await expect(loadServiceMap(COMMIT)).resolves.toMatchObject({ status: 'loaded' });
  expect(mockRequest).toHaveBeenCalledWith(
    `/2.0/repositories/${WORKSPACE_UUID}/${REPOSITORY_UUID}/src/${COMMIT}/blastradius.json`
  );
});

test('reports a missing file as not configured, not as a failure', async () => {
  mockRequest.mockResolvedValue(new Response('{}', { status: 404 }));

  await expect(loadServiceMap(COMMIT)).resolves.toEqual({ status: 'not-configured' });
});

test('reports invalid JSON as an invalid map', async () => {
  mockRequest.mockResolvedValue(new Response('{ not json', { status: 200 }));

  await expect(loadServiceMap(COMMIT)).resolves.toEqual({
    status: 'invalid',
    problems: ['The map file is not valid JSON.'],
  });
});

test('reports schema problems from the map', async () => {
  mockRequest.mockResolvedValue(new Response('{"version": 2}', { status: 200 }));

  const result = await loadServiceMap(COMMIT);

  expect(result.status).toBe('invalid');
});

test('rejects an oversized file without parsing it', async () => {
  mockRequest.mockResolvedValue(new Response(' '.repeat(256 * 1024 + 1), { status: 200 }));

  await expect(loadServiceMap(COMMIT)).resolves.toEqual({
    status: 'invalid',
    problems: ['The map file is too large.'],
  });
});

test.each([
  [401, FAILURE.DENIED],
  [403, FAILURE.DENIED],
  [429, FAILURE.RATE_LIMITED],
  [500, FAILURE.UNAVAILABLE],
])('maps HTTP %i to a failure, not to a missing map', async (status, kind) => {
  mockRequest.mockResolvedValue(new Response('{}', { status }));

  await expect(failureKindOf(loadServiceMap(COMMIT))).resolves.toBe(kind);
});

test('reports a failed request as unavailable', async () => {
  mockRequest.mockRejectedValue(new Error('network down'));

  await expect(failureKindOf(loadServiceMap(COMMIT))).resolves.toBe(FAILURE.UNAVAILABLE);
});

test.each([
  ['a path traversal', '../../secrets'],
  ['a non-hex value', 'main'],
  ['an empty value', ''],
])('rejects %s as a commit without calling Bitbucket', async (_name, commit) => {
  await expect(failureKindOf(loadServiceMap(commit))).resolves.toBe(FAILURE.MALFORMED);
  expect(mockRequest).not.toHaveBeenCalled();
});

test('the Northstar demo map is valid', async () => {
  mockRequest.mockResolvedValue(new Response(northstarMap, { status: 200 }));

  await expect(loadServiceMap(COMMIT)).resolves.toMatchObject({ status: 'loaded' });
});
