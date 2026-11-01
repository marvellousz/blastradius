// Limits what one request can ask for, as agreed in ADR-021.
export const MAX_ITEMS = 20;
export const EXCERPT_LENGTH = 300;

const WORK_ITEM_KEY = /^[A-Z]{2,}[A-Z0-9]*-[1-9]\d*$/;
const PAGE_ID = /^[1-9]\d*$/;

export interface ReadRequest {
  jira: string[];
  confluence: string[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const readList = (value: unknown, pattern: RegExp): string[] | null => {
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value)) {
    return null;
  }

  const items = value.filter((item): item is string => typeof item === 'string' && pattern.test(item));

  return items.length === value.length ? items : null;
};

/**
 * Validates a read request. The body comes from a public URL, so anything
 * unexpected rejects the whole request.
 */
export const parseReadRequest = (body: unknown): ReadRequest | null => {
  if (typeof body !== 'string') {
    return null;
  }

  let source: unknown;
  try {
    source = JSON.parse(body);
  } catch {
    return null;
  }

  if (!isRecord(source)) {
    return null;
  }

  const jira = readList(source.jira, WORK_ITEM_KEY);
  const confluence = readList(source.confluence, PAGE_ID);

  if (!jira || !confluence || jira.length + confluence.length > MAX_ITEMS) {
    return null;
  }

  return { jira: [...new Set(jira)], confluence: [...new Set(confluence)] };
};

/**
 * Reduces Confluence storage format to a short plain-text excerpt. The result
 * is displayed as text and later fed to analysis as untrusted data, never as
 * instructions.
 */
export const toExcerpt = (storage: unknown): string | null => {
  if (typeof storage !== 'string') {
    return null;
  }

  const text = storage
    .slice(0, EXCERPT_LENGTH * 20)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return text.length > 0 ? text.slice(0, EXCERPT_LENGTH) : null;
};
