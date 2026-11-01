import { beforeEach, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requestJira: vi.fn(),
  requestConfluence: vi.fn(),
  getSecret: vi.fn(),
}));

vi.mock('@forge/api', () => ({
  default: { asApp: () => ({ requestJira: mocks.requestJira, requestConfluence: mocks.requestConfluence }) },
  route: (strings: TemplateStringsArray, ...values: unknown[]) =>
    strings.reduce((path, part, index) => `${path}${part}${values[index] ?? ''}`, ''),
}));

vi.mock('@forge/kvs', () => ({
  kvs: { getSecret: mocks.getSecret, setSecret: vi.fn() },
}));

import { read } from '../src/read';

const TOKEN = 'a'.repeat(64);

const event = (body: unknown, overrides: Record<string, unknown> = {}) => ({
  method: 'POST',
  headers: { authorization: [`Bearer ${TOKEN}`] },
  body: JSON.stringify(body),
  ...overrides,
});

const issue = {
  fields: { summary: 'A requirement', status: { name: 'To Do' }, description: 'Secret detail' },
};

const page = {
  title: 'Contract',
  version: { number: 3 },
  body: { storage: { value: '<p>Must include receiptUrl.</p>' } },
};

const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });

beforeEach(() => {
  mocks.getSecret.mockReset().mockResolvedValue(TOKEN);
  mocks.requestJira.mockReset().mockImplementation(async () => ok(issue));
  mocks.requestConfluence.mockReset().mockImplementation(async () => ok(page));
});

test('returns only the agreed fields', async () => {
  const response = await read(event({ jira: ['KAN-4'], confluence: ['98307'] }));

  expect(response.statusCode).toBe(200);
  expect(JSON.parse(response.body)).toEqual({
    jira: [{ key: 'KAN-4', found: true, title: 'A requirement', status: 'To Do' }],
    confluence: [{ id: '98307', found: true, title: 'Contract', version: 3, excerpt: 'Must include receiptUrl.' }],
  });
  expect(response.body).not.toContain('Secret detail');
});

test.each([
  ['no header', { headers: {} }],
  ['the wrong token', { headers: { authorization: ['Bearer nope'] } }],
  ['no bearer prefix', { headers: { authorization: [TOKEN] } }],
])('refuses %s without reading anything', async (_name, overrides) => {
  const response = await read(event({ jira: ['KAN-4'] }, overrides));

  expect(response.statusCode).toBe(401);
  expect(mocks.requestJira).not.toHaveBeenCalled();
});

test.each([
  ['a valid-looking token', `Bearer ${TOKEN}`],
  ['the text a missing value becomes', 'Bearer undefined'],
])('fails closed when no token is stored, given %s', async (_name, header) => {
  mocks.getSecret.mockResolvedValue(undefined);

  const response = await read(event({ jira: ['KAN-4'] }, { headers: { authorization: [header] } }));

  expect(response.statusCode).toBe(401);
  expect(mocks.requestJira).not.toHaveBeenCalled();
});

test.each([
  ['part of the token', `Bearer ${TOKEN.slice(0, 32)}`],
  ['only the prefix', 'Bearer '],
  ['an empty header', ''],
])('refuses %s', async (_name, header) => {
  const response = await read(event({ jira: ['KAN-4'] }, { headers: { authorization: [header] } }));

  expect(response.statusCode).toBe(401);
});

test('checks the token before the method, so nothing is revealed without it', async () => {
  const response = await read(event({}, { method: 'GET', headers: {} }));

  expect(response.statusCode).toBe(401);
});

test('refuses other methods', async () => {
  expect((await read(event({}, { method: 'GET' }))).statusCode).toBe(405);
});

test('rejects a malformed request', async () => {
  expect((await read(event({ jira: ['../admin'] }))).statusCode).toBe(400);
  expect(mocks.requestJira).not.toHaveBeenCalled();
});

test('reports an item that cannot be read as not found', async () => {
  mocks.requestJira.mockResolvedValue(new Response('{}', { status: 404 }));

  const response = await read(event({ jira: ['KAN-4'] }));

  expect(JSON.parse(response.body).jira).toEqual([{ key: 'KAN-4', found: false }]);
});

test('reports a failed product request without details', async () => {
  mocks.requestJira.mockRejectedValue(new Error('internal detail'));

  const response = await read(event({ jira: ['KAN-4'] }));

  expect(response.statusCode).toBe(502);
  expect(response.body).not.toContain('internal detail');
});
