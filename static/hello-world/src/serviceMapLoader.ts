import { parseServiceMap, type ServiceMap } from './analysis/serviceMap';
import {
  FAILURE,
  PullRequestLoadError,
  failureForStatus,
  readPullRequestLocation,
  repositoryPath,
  request,
} from './pullRequest';

export const SERVICE_MAP_FILE = 'blastradius.json';
const MAX_MAP_CHARACTERS = 256 * 1024;
const COMMIT_HASH = /^[0-9a-f]{7,40}$/i;

export type ServiceMapLoadResult =
  | { status: 'not-configured' }
  | { status: 'invalid'; problems: string[] }
  | { status: 'loaded'; map: ServiceMap };

const parseText = (text: string): ServiceMapLoadResult => {
  if (text.length > MAX_MAP_CHARACTERS) {
    return { status: 'invalid', problems: ['The map file is too large.'] };
  }

  let source: unknown;
  try {
    source = JSON.parse(text);
  } catch {
    return { status: 'invalid', problems: ['The map file is not valid JSON.'] };
  }

  const result = parseServiceMap(source);

  return result.valid
    ? { status: 'loaded', map: result.map }
    : { status: 'invalid', problems: result.problems };
};

/**
 * Loads the service map from the pull request's destination commit as the
 * current user. Reading the destination, not the source branch, stops a pull
 * request from editing the map to hide its own impact.
 *
 * @throws {PullRequestLoadError} With the category of failure.
 */
export async function loadServiceMap(destinationCommit: string): Promise<ServiceMapLoadResult> {
  if (!COMMIT_HASH.test(destinationCommit)) {
    throw new PullRequestLoadError(FAILURE.MALFORMED);
  }

  const location = await readPullRequestLocation();
  const response = await request(
    `${repositoryPath(location)}/src/${destinationCommit}/${SERVICE_MAP_FILE}`
  );

  // The pull request already loaded, so a 404 here means the file is absent.
  if (response.status === 404) {
    return { status: 'not-configured' };
  }
  if (!response.ok) {
    throw new PullRequestLoadError(failureForStatus(response.status));
  }

  try {
    return parseText(await response.text());
  } catch {
    throw new PullRequestLoadError(FAILURE.MALFORMED);
  }
}
