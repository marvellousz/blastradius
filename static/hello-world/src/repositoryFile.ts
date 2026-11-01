import {
  FAILURE,
  PullRequestLoadError,
  failureForStatus,
  readPullRequestLocation,
  repositoryPath,
  request,
} from './pullRequest';

const MAX_FILE_CHARACTERS = 256 * 1024;
const COMMIT_HASH = /^[0-9a-f]{7,40}$/i;

export type RepositoryFile =
  | { status: 'missing' }
  | { status: 'too-large' }
  | { status: 'found'; text: string };

/**
 * Reads a text file at a commit as the current user. The caller has already
 * loaded the pull request, so a 404 here means this file is absent.
 *
 * @throws {PullRequestLoadError} With the category of failure.
 */
export async function readRepositoryFile(commit: string, path: string): Promise<RepositoryFile> {
  if (!COMMIT_HASH.test(commit)) {
    throw new PullRequestLoadError(FAILURE.MALFORMED);
  }

  const location = await readPullRequestLocation();
  const encodedPath = path.split('/').map(encodeURIComponent).join('/');
  const response = await request(`${repositoryPath(location)}/src/${commit}/${encodedPath}`);

  if (response.status === 404) {
    return { status: 'missing' };
  }
  if (!response.ok) {
    throw new PullRequestLoadError(failureForStatus(response.status));
  }

  let text: string;
  try {
    text = await response.text();
  } catch {
    throw new PullRequestLoadError(FAILURE.MALFORMED);
  }

  return text.length > MAX_FILE_CHARACTERS ? { status: 'too-large' } : { status: 'found', text };
}
