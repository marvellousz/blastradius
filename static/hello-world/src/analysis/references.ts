// Pure logic with no Forge or React imports, so the backend can reuse it later.

const MAX_TEXT_CHARACTERS = 20000;
const MAX_FOUND = 20;

const WORK_ITEM_KEY = /(?<![A-Za-z0-9-])[A-Z]{2,}[A-Z0-9]*-[1-9]\d*(?![A-Za-z0-9])/g;
const SINGLE_WORK_ITEM_KEY = /^[A-Z]{2,}[A-Z0-9]*-[1-9]\d*$/;
const URL_TEXT = /https:\/\/[^\s<>"')\]]+/g;
// Common names that look like work item keys, such as UTF-8 or SHA-256.
const IGNORED_PREFIXES = new Set(['CVE', 'HTTP', 'ISO', 'RFC', 'SHA', 'TLS', 'UTF']);

export const isWorkItemKey = (value: string): boolean => SINGLE_WORK_ITEM_KEY.test(value);

export const isConfluenceUrl = (value: string): boolean => {
  if (!URL.canParse(value)) {
    return false;
  }

  const { protocol, hostname, pathname } = new URL(value);

  return protocol === 'https:' && hostname.endsWith('.atlassian.net') && pathname.startsWith('/wiki/');
};

const PAGE_ID = /^[1-9]\d*$/;

/** Finds the page ID in a Confluence URL, in either the query or the path. */
export const confluencePageId = (url: string): string | null => {
  if (!isConfluenceUrl(url)) {
    return null;
  }

  const { searchParams, pathname } = new URL(url);
  const id = searchParams.get('pageId') ?? pathname.match(/\/pages\/(\d+)(\/|$)/)?.[1];

  return id && PAGE_ID.test(id) ? id : null;
};

export type ReferenceSource = 'title' | 'branch' | 'description';

export interface FoundKey {
  key: string;
  sources: ReferenceSource[];
}

export interface FoundReferences {
  keys: FoundKey[];
  confluenceLinks: string[];
}

interface PullRequestText {
  title: string;
  sourceBranch: string;
  description: string | null;
}

const findKeys = (text: string): string[] =>
  (text.slice(0, MAX_TEXT_CHARACTERS).match(WORK_ITEM_KEY) ?? []).filter(
    (key) => !IGNORED_PREFIXES.has(key.split('-')[0] ?? '')
  );

/**
 * Finds work item keys and Confluence links in a pull request's own text. These
 * are references only: nothing here shows that the item exists.
 */
export const findReferences = ({ title, sourceBranch, description }: PullRequestText): FoundReferences => {
  const sourcesByKey = new Map<string, ReferenceSource[]>();
  const texts: Array<[ReferenceSource, string]> = [
    ['title', title],
    ['branch', sourceBranch],
    ['description', description ?? ''],
  ];

  for (const [source, text] of texts) {
    for (const key of new Set(findKeys(text))) {
      sourcesByKey.set(key, [...(sourcesByKey.get(key) ?? []), source]);
    }
  }

  // Sentence punctuation directly after a URL is not part of the link.
  const links = ((description ?? '').slice(0, MAX_TEXT_CHARACTERS).match(URL_TEXT) ?? [])
    .map((link) => link.replace(/[.,;:!?]+$/, ''));

  return {
    keys: [...sourcesByKey].slice(0, MAX_FOUND).map(([key, sources]) => ({ key, sources })),
    confluenceLinks: [...new Set(links.filter(isConfluenceUrl))].slice(0, MAX_FOUND),
  };
};
