import { beforeEach, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requestJira: vi.fn(),
  getUrl: vi.fn(),
  getSecret: vi.fn(),
  setSecret: vi.fn(),
}));

vi.mock('@forge/api', () => ({
  default: { asUser: () => ({ requestJira: mocks.requestJira }) },
  route: (strings: TemplateStringsArray) => strings.join(''),
  webTrigger: { getUrl: mocks.getUrl },
}));

vi.mock('@forge/kvs', () => ({
  kvs: { getSecret: mocks.getSecret, setSecret: mocks.setSecret },
}));

import { handler } from '../src/resolvers';

const call = (functionKey: string) => handler({ call: { functionKey }, context: {} });

const permission = (havePermission: boolean) =>
  new Response(JSON.stringify({ permissions: { ADMINISTER: { havePermission } } }), { status: 200 });

beforeEach(() => {
  mocks.requestJira.mockReset().mockImplementation(async () => permission(true));
  mocks.getUrl.mockReset().mockResolvedValue('https://example.webtrigger.atlassian.app/public/x');
  mocks.getSecret.mockReset().mockResolvedValue(undefined);
  mocks.setSecret.mockReset().mockResolvedValue(undefined);
});

test('an admin gets the connection URL and token state', async () => {
  await expect(call('getConnection')).resolves.toEqual({
    allowed: true,
    url: 'https://example.webtrigger.atlassian.app/public/x',
    hasToken: false,
  });
});

test('never returns a stored token', async () => {
  mocks.getSecret.mockResolvedValue('stored-token');

  const result = await call('getConnection');

  expect(JSON.stringify(result)).not.toContain('stored-token');
});

test('creating a token stores and returns a long random value', async () => {
  const result = await call('createToken');

  expect(result).toMatchObject({ allowed: true, token: expect.stringMatching(/^[0-9a-f]{64}$/) });
  expect(mocks.setSecret).toHaveBeenCalledTimes(1);
});

test('each token is different', async () => {
  const first = await call('createToken');
  const second = await call('createToken');

  expect(first).not.toEqual(second);
});

test.each([
  ['a non-admin', async () => permission(false)],
  ['a failed permission check', async () => new Response('{}', { status: 403 })],
  ['an unexpected response', async () => new Response('{}', { status: 200 })],
])('%s gets nothing', async (_name, respond) => {
  mocks.requestJira.mockImplementation(respond);

  await expect(call('getConnection')).resolves.toEqual({ allowed: false });
  await expect(call('createToken')).resolves.toEqual({ allowed: false });
  expect(mocks.getUrl).not.toHaveBeenCalled();
  expect(mocks.setSecret).not.toHaveBeenCalled();
});
