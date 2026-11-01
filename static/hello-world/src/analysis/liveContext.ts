import { isRecord, isText, readField } from '../validation';

// Pure logic with no Forge or React imports. The backend validates the companion
// app's response with this, and the panel validates what the backend returns.

export interface LiveWorkItem {
  key: string;
  // Null means the connected app could not read it.
  title: string | null;
  status: string | null;
}

export interface LivePage {
  id: string;
  title: string | null;
  version: number | null;
  excerpt: string | null;
}

export type LiveContext =
  | { status: 'not-connected' }
  | { status: 'unavailable' }
  | { status: 'ok'; jira: LiveWorkItem[]; confluence: LivePage[] };

const toText = (value: unknown): string | null => (isText(value) ? value : null);

const toWorkItem = (entry: unknown): LiveWorkItem | null => {
  const key = readField(entry, 'key');

  return isText(key)
    ? { key, title: toText(readField(entry, 'title')), status: toText(readField(entry, 'status')) }
    : null;
};

const toPage = (entry: unknown): LivePage | null => {
  const id = readField(entry, 'id');
  const version = readField(entry, 'version');

  return isText(id)
    ? {
      id,
      title: toText(readField(entry, 'title')),
      version: typeof version === 'number' ? version : null,
      excerpt: toText(readField(entry, 'excerpt')),
    }
    : null;
};

const toList = <T>(value: unknown, convert: (entry: unknown) => T | null): T[] | null => {
  if (!Array.isArray(value)) {
    return null;
  }

  const items = value.map(convert).filter((item) => item !== null);

  return items.length === value.length ? items : null;
};

/** Reads the `jira` and `confluence` lists, or null if either is malformed. */
export const parseLiveItems = (
  source: unknown
): { jira: LiveWorkItem[]; confluence: LivePage[] } | null => {
  if (!isRecord(source)) {
    return null;
  }

  const jira = toList(source.jira, toWorkItem);
  const confluence = toList(source.confluence, toPage);

  return jira && confluence ? { jira, confluence } : null;
};

/** Validates what the backend returned. Anything unexpected reads as unavailable. */
export const parseLiveContext = (source: unknown): LiveContext => {
  const status = readField(source, 'status');

  if (status === 'not-connected') {
    return { status };
  }

  const items = status === 'ok' ? parseLiveItems(source) : null;

  return items ? { status: 'ok', ...items } : { status: 'unavailable' };
};
