import api, { route } from '@forge/api';
import type { LiveContext } from '../static/hello-world/src/analysis/liveContext';
import { confluencePageId } from '../static/hello-world/src/analysis/references';
import { parseServiceMap, type ServiceMap } from '../static/hello-world/src/analysis/serviceMap';
import { isText, readField } from '../static/hello-world/src/validation';
import { readConnection, readItems } from './connection';
import { toWorkspaceParam } from './workspaceAccess';

// One request is limited to this by the companion app.
const MAX_ITEMS = 20;
const COMMIT_HASH = /^[0-9a-f]{7,40}$/i;
const REPOSITORY_ID = /^\{[0-9a-f-]{36}\}$/i;
const PULL_REQUEST_ID = /^[1-9]\d*$/;

const UNAVAILABLE: LiveContext = { status: 'unavailable' };

const readLocation = (context: unknown) => {
  const workspaceId = readField(context, 'workspaceId');
  const repository = readField(context, 'extension', 'repository', 'uuid');
  const pullRequestId = String(readField(context, 'extension', 'pullRequest', 'id'));

  return isText(workspaceId) && isText(repository) && REPOSITORY_ID.test(repository) &&
    PULL_REQUEST_ID.test(pullRequestId)
    ? { workspace: toWorkspaceParam(workspaceId), repository, pullRequestId }
    : null;
};

// Items come only from the destination commit's map, never from the browser or
// pull request text. Otherwise anyone could type a Jira key and read its title.
const collectItems = (map: ServiceMap) => {
  const references = map.services.flatMap(({ references: items }) => items);
  const jira = references.flatMap((item) => (item.type === 'jira' ? [item.key] : []));
  const confluence = references.flatMap((item) => {
    const id = item.type === 'confluence' ? confluencePageId(item.url) : null;

    return id ? [id] : [];
  });
  const uniqueJira = [...new Set(jira)].slice(0, MAX_ITEMS);

  return {
    jira: uniqueJira,
    confluence: [...new Set(confluence)].slice(0, MAX_ITEMS - uniqueJira.length),
  };
};

const parseMap = (text: string): ServiceMap | null => {
  try {
    const result = parseServiceMap(JSON.parse(text));

    return result.valid ? result.map : null;
  } catch {
    return null;
  }
};

/**
 * Reads live Jira and Confluence data for the panel's pull request. The context
 * comes from Forge, so it is safe to trust here, unlike a browser payload. Reads
 * from Bitbucket run as the user, so they respect repository access.
 */
export const getLiveContext = async (context: unknown): Promise<LiveContext> => {
  const connection = await readConnection();

  if (!connection) {
    return { status: 'not-connected' };
  }

  const location = readLocation(context);

  if (!location) {
    return UNAVAILABLE;
  }

  const { workspace, repository, pullRequestId } = location;
  const bitbucket = api.asUser();
  const pullRequest = await bitbucket.requestBitbucket(
    route`/2.0/repositories/${workspace}/${repository}/pullrequests/${pullRequestId}`
  );

  if (!pullRequest.ok) {
    return UNAVAILABLE;
  }

  const commit = readField(await pullRequest.json(), 'destination', 'commit', 'hash');

  if (typeof commit !== 'string' || !COMMIT_HASH.test(commit)) {
    return UNAVAILABLE;
  }

  const file = await bitbucket.requestBitbucket(
    route`/2.0/repositories/${workspace}/${repository}/src/${commit}/blastradius.json`
  );
  const map = file.ok ? parseMap(await file.text()) : null;

  if (!map) {
    return UNAVAILABLE;
  }

  const items = await readItems(connection, collectItems(map));

  return items ? { status: 'ok', ...items } : UNAVAILABLE;
};
