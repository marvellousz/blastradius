import { requestBitbucket } from '@forge/bridge';
import { beforeEach, expect, test, vi } from 'vitest';
import { readRepositoryFile } from './repositoryFile';

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
const BASE_PATH = `/2.0/repositories/${WORKSPACE_UUID}/${REPOSITORY_UUID}/src/${COMMIT}`;

beforeEach(() => {
  mockGetContext.mockReset().mockResolvedValue({
    workspaceId: WORKSPACE_UUID,
    extension: { repository: { uuid: REPOSITORY_UUID }, pullRequest: { id: 1 } },
  });
  mockRequest.mockReset().mockResolvedValue(new Response('content', { status: 200 }));
});

test('keeps path separators and returns the text', async () => {
  await expect(readRepositoryFile(COMMIT, 'services/payment/schema.json')).resolves.toEqual({
    status: 'found',
    text: 'content',
  });
  expect(mockRequest).toHaveBeenCalledWith(`${BASE_PATH}/services/payment/schema.json`);
});

test('encodes characters that would change the request', async () => {
  await readRepositoryFile(COMMIT, 'my schemas/a?b#c.json');

  expect(mockRequest).toHaveBeenCalledWith(`${BASE_PATH}/my%20schemas/a%3Fb%23c.json`);
});
