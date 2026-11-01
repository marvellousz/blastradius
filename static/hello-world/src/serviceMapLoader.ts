import { parseServiceMap, type ServiceMap } from './analysis/serviceMap';
import { readRepositoryFile } from './repositoryFile';

export const SERVICE_MAP_FILE = 'blastradius.json';

export type ServiceMapLoadResult =
  | { status: 'not-configured' }
  | { status: 'invalid'; problems: string[] }
  | { status: 'loaded'; map: ServiceMap };

const parseText = (text: string): ServiceMapLoadResult => {
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
  const file = await readRepositoryFile(destinationCommit, SERVICE_MAP_FILE);

  if (file.status === 'missing') {
    return { status: 'not-configured' };
  }
  if (file.status === 'too-large') {
    return { status: 'invalid', problems: ['The map file is too large.'] };
  }

  return parseText(file.text);
}
