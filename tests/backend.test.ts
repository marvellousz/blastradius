import { beforeEach, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requestBitbucket: vi.fn(),
  fetch: vi.fn(),
  getSecret: vi.fn(),
  setSecret: vi.fn(),
  deleteSecret: vi.fn(),
}));

vi.mock('@forge/api', () => ({
  default: { asUser: () => ({ requestBitbucket: mocks.requestBitbucket }) },
  fetch: mocks.fetch,
  route: (strings: TemplateStringsArray, ...values: unknown[]) =>
    strings.reduce((path, part, index) => `${path}${part}${values[index] ?? ''}`, ''),
}));

vi.mock('@forge/kvs', () => ({
  kvs: { getSecret: mocks.getSecret, setSecret: mocks.setSecret, deleteSecret: mocks.deleteSecret },
}));

import { handler } from '../src/index';

const WORKSPACE = '11111111-2222-3333-4444-555555555555';
const REPOSITORY = '{aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee}';
const CONNECTION = {
  url: 'https://x.webtrigger.atlassian.app/public/abc',
  token: 'a'.repeat(64),
};

const CONTEXT = {
  workspaceId: WORKSPACE,
  extension: { repository: { uuid: REPOSITORY }, pullRequest: { id: 2 } },
};

const MAP = {
  version: 1,
  services: [{
    id: 'payment',
    name: 'Payment',
    paths: ['a/**'],
    references: [
      { type: 'jira', key: 'KAN-4' },
      { type: 'confluence', url: 'https://a.atlassian.net/wiki/pages/viewpage.action?pageId=98307' },
    ],
  }],
  dependencies: [],
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

const call = (functionKey: string, payload?: unknown, context: unknown = CONTEXT) =>
  handler({ call: { functionKey, payload }, context: context as Record<string, unknown> });

const respondAsOwner = (permission = 'owner') => {
  mocks.requestBitbucket.mockImplementation(async (path: string) => {
    if (path.includes('/permission')) {
      return json({ permission });
    }
    if (path.includes('/src/')) {
      return json(MAP);
    }
    return json({ destination: { commit: { hash: 'def456abc123' } } });
  });
};

beforeEach(() => {
  mocks.requestBitbucket.mockReset();
  mocks.fetch.mockReset().mockImplementation(async () => json({ jira: [], confluence: [] }));
  mocks.getSecret.mockReset().mockResolvedValue(CONNECTION);
  mocks.setSecret.mockReset();
  mocks.deleteSecret.mockReset();
  respondAsOwner();
});

test('live context reports not connected without calling anything', async () => {
  mocks.getSecret.mockResolvedValue(undefined);

  await expect(call('getLiveContext')).resolves.toEqual({ status: 'not-connected' });
  expect(mocks.requestBitbucket).not.toHaveBeenCalled();
  expect(mocks.fetch).not.toHaveBeenCalled();
});

test('requests only items in the destination map, sending the stored token', async () => {
  await call('getLiveContext');

  expect(mocks.requestBitbucket).toHaveBeenCalledWith(
    `/2.0/repositories/{${WORKSPACE}}/${REPOSITORY}/src/def456abc123/blastradius.json`
  );
  expect(mocks.fetch).toHaveBeenCalledWith(CONNECTION.url, expect.objectContaining({
    method: 'POST',
    headers: expect.objectContaining({ Authorization: `Bearer ${CONNECTION.token}` }),
    body: JSON.stringify({ jira: ['KAN-4'], confluence: ['98307'] }),
  }));
});

test('ignores anything the browser sends', async () => {
  await call('getLiveContext', { jira: ['SECRET-1'] });

  expect(mocks.fetch.mock.calls[0]?.[1]?.body).not.toContain('SECRET-1');
});

test('returns live items', async () => {
  mocks.fetch.mockImplementation(async () => json({
    jira: [{ key: 'KAN-4', found: true, title: 'A', status: 'To Do' }],
    confluence: [],
  }));

  await expect(call('getLiveContext')).resolves.toEqual({
    status: 'ok',
    jira: [{ key: 'KAN-4', title: 'A', status: 'To Do' }],
    confluence: [],
  });
});

test('never returns the token', async () => {
  const result = await call('getLiveContext');

  expect(JSON.stringify(result)).not.toContain(CONNECTION.token);
});

test.each([
  ['missing context', {}],
  ['an invalid repository', { ...CONTEXT, extension: { repository: { uuid: '../x' }, pullRequest: { id: 2 } } }],
  ['an invalid pull request', { ...CONTEXT, extension: { repository: { uuid: REPOSITORY }, pullRequest: { id: 'x/y' } } }],
])('%s is unavailable, without calling the companion', async (_name, context) => {
  await expect(call('getLiveContext', undefined, context)).resolves.toEqual({ status: 'unavailable' });
  expect(mocks.fetch).not.toHaveBeenCalled();
});

test.each([
  ['the pull request cannot be read', async () => json({}, 404)],
  ['the commit is invalid', async () => json({ destination: { commit: { hash: '../x' } } })],
])('%s is unavailable', async (_name, respond) => {
  mocks.requestBitbucket.mockImplementation(respond);

  await expect(call('getLiveContext')).resolves.toEqual({ status: 'unavailable' });
  expect(mocks.fetch).not.toHaveBeenCalled();
});

test('an invalid map is unavailable', async () => {
  mocks.requestBitbucket.mockImplementation(async (path: string) =>
    path.includes('/src/') ? new Response('{ nope') : json({ destination: { commit: { hash: 'def456abc123' } } })
  );

  await expect(call('getLiveContext')).resolves.toEqual({ status: 'unavailable' });
});

test.each([
  ['a refused call', async () => json({}, 401)],
  ['a network failure', async () => { throw new Error('down'); }],
  ['a malformed response', async () => json({ jira: 'x' })],
])('%s from the companion is unavailable', async (_name, respond) => {
  mocks.fetch.mockImplementation(respond);

  await expect(call('getLiveContext')).resolves.toEqual({ status: 'unavailable' });
});

test('an owner sees the connection state, without the token', async () => {
  const result = await call('getConnectionStatus');

  expect(result).toEqual({ allowed: true, connected: true });
});

test('checks ownership with a wrapped workspace id', async () => {
  await call('getConnectionStatus');

  expect(mocks.requestBitbucket).toHaveBeenCalledWith(`/2.0/user/workspaces/{${WORKSPACE}}/permission`);
});

test.each(['member', 'collaborator', 'create-project'])('a %s cannot manage the connection', async (role) => {
  respondAsOwner(role);

  await expect(call('getConnectionStatus')).resolves.toEqual({ allowed: false });
  await expect(call('saveConnection', CONNECTION)).resolves.toEqual({ result: 'forbidden' });
  await expect(call('clearConnection')).resolves.toEqual({ result: 'forbidden' });
  expect(mocks.setSecret).not.toHaveBeenCalled();
  expect(mocks.deleteSecret).not.toHaveBeenCalled();
});

test.each([
  ['with no role', {}],
  ['even if its body claims a role', { permission: 'owner' }],
])('a failed permission check fails closed %s', async (_name, body) => {
  mocks.requestBitbucket.mockImplementation(async () => json(body, 403));

  await expect(call('saveConnection', CONNECTION)).resolves.toEqual({ result: 'forbidden' });
});

test('saves a working connection', async () => {
  await expect(call('saveConnection', CONNECTION)).resolves.toEqual({ result: 'saved' });
  expect(mocks.setSecret).toHaveBeenCalledWith('companion-connection', CONNECTION);
});

test.each([
  ['another host', { ...CONNECTION, url: 'https://attacker.example/public/abc' }],
  ['a lookalike host', { ...CONNECTION, url: 'https://x.webtrigger.atlassian.app.attacker.example/a' }],
  ['plain http', { ...CONNECTION, url: 'http://x.webtrigger.atlassian.app/public/abc' }],
  ['a short token', { ...CONNECTION, token: 'abc' }],
  ['nothing', undefined],
])('refuses to save %s, or send it the token', async (_name, payload) => {
  await expect(call('saveConnection', payload)).resolves.toEqual({ result: 'invalid' });
  expect(mocks.fetch).not.toHaveBeenCalled();
  expect(mocks.setSecret).not.toHaveBeenCalled();
});

test('does not save a connection that fails its test', async () => {
  mocks.fetch.mockImplementation(async () => json({}, 401));

  await expect(call('saveConnection', CONNECTION)).resolves.toEqual({ result: 'unreachable' });
  expect(mocks.setSecret).not.toHaveBeenCalled();
});

test('an owner can disconnect', async () => {
  await expect(call('clearConnection')).resolves.toEqual({ result: 'cleared' });
  expect(mocks.deleteSecret).toHaveBeenCalledWith('companion-connection');
});
