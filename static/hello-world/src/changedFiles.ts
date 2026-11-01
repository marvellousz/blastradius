import {
  FAILURE,
  PullRequestLoadError,
  pullRequestPath,
  readPullRequestLocation,
  requestJson,
} from './pullRequest';
import { isText, readField } from './validation';

// Agreed input limits. The panel must stay responsive on very large pull
// requests, and anything beyond these limits is reported as incomplete.
export const MAX_FILES = 200;
const MAX_PAGES = 5;

export interface ChangedFile {
  path: string;
  // The old path of a renamed file, otherwise null.
  previousPath: string | null;
  status: string;
  // Null means Bitbucket gave no count, which must not read as zero.
  linesAdded: number | null;
  linesRemoved: number | null;
}

export interface ChangedFilesResult {
  files: ChangedFile[];
  // True when the pull request has more files than `files` contains.
  truncated: boolean;
}

const malformed = () => new PullRequestLoadError(FAILURE.MALFORMED);

const toLineCount = (value: unknown): number | null => {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    throw malformed();
  }
  return value;
};

// A removed file has no new path, so fall back to the old one.
const toChangedFile = (entry: unknown): ChangedFile => {
  const status = readField(entry, 'status');
  const newPath = readField(entry, 'new', 'path');
  const oldPath = readField(entry, 'old', 'path');
  const path = isText(newPath) ? newPath : oldPath;

  if (!isText(status) || !isText(path)) {
    throw malformed();
  }

  return {
    path,
    previousPath: status === 'renamed' && isText(oldPath) ? oldPath : null,
    status,
    linesAdded: toLineCount(readField(entry, 'lines_added')),
    linesRemoved: toLineCount(readField(entry, 'lines_removed')),
  };
};

// Bitbucket says to follow `next` rather than build page URLs. It is still
// external data, so only a Bitbucket API path may be requested from it.
const toNextPath = (next: unknown): string | null => {
  if (next === undefined || next === null) {
    return null;
  }
  if (!isText(next) || !URL.canParse(next)) {
    throw malformed();
  }

  const { protocol, hostname, pathname, search } = new URL(next);

  if (
    protocol !== 'https:' ||
    hostname !== 'api.bitbucket.org' ||
    !pathname.startsWith('/2.0/repositories/')
  ) {
    throw malformed();
  }

  return `${pathname}${search}`;
};

/**
 * Loads the files changed by this pull request as the current Bitbucket user.
 * Any invalid entry rejects the whole list, so a partial list is never shown
 * as complete.
 *
 * @throws {PullRequestLoadError} With the category of failure.
 */
export async function loadChangedFiles(): Promise<ChangedFilesResult> {
  const location = await readPullRequestLocation();
  const files: ChangedFile[] = [];
  let path: string | null = `${pullRequestPath(location)}/diffstat?pagelen=${MAX_FILES}`;

  for (let page = 0; path !== null && page < MAX_PAGES && files.length < MAX_FILES; page += 1) {
    const body = await requestJson(path);
    const values = readField(body, 'values');

    if (!Array.isArray(values)) {
      throw malformed();
    }

    files.push(...values.map(toChangedFile));
    path = toNextPath(readField(body, 'next'));
  }

  return {
    files: files.slice(0, MAX_FILES),
    truncated: path !== null || files.length > MAX_FILES,
  };
}
