import { fetch } from '@forge/api';
import { kvs } from '@forge/kvs';
import { parseLiveItems } from '../static/hello-world/src/analysis/liveContext';
import { isRecord } from '../static/hello-world/src/validation';

const CONNECTION_KEY = 'companion-connection';
const COMPANION_HOST_SUFFIX = '.webtrigger.atlassian.app';
const TOKEN = /^[0-9a-f]{64}$/;

export interface Connection {
  url: string;
  token: string;
}

interface ItemRequest {
  jira: string[];
  confluence: string[];
}

const isCompanionUrl = (value: unknown): value is string => {
  if (typeof value !== 'string' || !URL.canParse(value)) {
    return false;
  }

  const { protocol, hostname } = new URL(value);

  return protocol === 'https:' && hostname.endsWith(COMPANION_HOST_SUFFIX);
};

/** Validates a connection. It comes from a form, so it is untrusted. */
export const parseConnection = (source: unknown): Connection | null => {
  if (!isRecord(source) || !isCompanionUrl(source.url)) {
    return null;
  }

  return typeof source.token === 'string' && TOKEN.test(source.token)
    ? { url: source.url, token: source.token }
    : null;
};

export const readConnection = async (): Promise<Connection | null> =>
  parseConnection(await kvs.getSecret(CONNECTION_KEY));

export const saveConnection = (connection: Connection) => kvs.setSecret(CONNECTION_KEY, connection);

export const clearConnection = () => kvs.deleteSecret(CONNECTION_KEY);

const callCompanion = ({ url, token }: Connection, items: ItemRequest) =>
  fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(items),
  });

/** Confirms the URL and token work, without requesting any data. */
export const testConnection = async (connection: Connection): Promise<boolean> => {
  try {
    return (await callCompanion(connection, { jira: [], confluence: [] })).ok;
  } catch {
    return false;
  }
};

/** Reads items from the companion, or returns null if that fails in any way. */
export const readItems = async (connection: Connection, items: ItemRequest) => {
  try {
    const response = await callCompanion(connection, items);

    return response.ok ? parseLiveItems(await response.json()) : null;
  } catch {
    return null;
  }
};
