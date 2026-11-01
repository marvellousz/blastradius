import api, { route } from '@forge/api';
import { parseReadRequest, toExcerpt } from './request';
import { isAuthorized } from './token';

// Web trigger URLs are public and Forge does not authenticate them, so the token
// check below is the only gate. Reads use asApp, which ignores the viewer's own
// Jira and Confluence permissions. ADR-021 limits what is returned to a title,
// status, and short excerpt. Nothing here logs request or response data.

interface TriggerEvent {
  method?: string;
  body?: unknown;
  headers?: Record<string, string[] | undefined>;
}

const respond = (statusCode: number, body: unknown) => ({
  body: JSON.stringify(body),
  headers: { 'Content-Type': ['application/json'] },
  statusCode,
  statusText: statusCode === 200 ? 'OK' : 'Error',
});

const readWorkItem = async (key: string) => {
  const response = await api.asApp().requestJira(route`/rest/api/3/issue/${key}?fields=summary,status`);

  if (!response.ok) {
    return { key, found: false };
  }

  const issue = await response.json();

  return { key, found: true, title: issue.fields?.summary, status: issue.fields?.status?.name };
};

const readPage = async (id: string) => {
  const response = await api.asApp().requestConfluence(route`/wiki/api/v2/pages/${id}?body-format=storage`);

  if (!response.ok) {
    return { id, found: false };
  }

  const page = await response.json();

  return {
    id,
    found: true,
    title: page.title,
    version: page.version?.number,
    excerpt: toExcerpt(page.body?.storage?.value),
  };
};

export const read = async (event: TriggerEvent) => {
  if (!(await isAuthorized(event.headers?.authorization?.[0]))) {
    return respond(401, { error: 'unauthorized' });
  }

  if (event.method !== 'POST') {
    return respond(405, { error: 'method not allowed' });
  }

  const request = parseReadRequest(event.body);

  if (!request) {
    return respond(400, { error: 'invalid request' });
  }

  try {
    const [jira, confluence] = await Promise.all([
      Promise.all(request.jira.map(readWorkItem)),
      Promise.all(request.confluence.map(readPage)),
    ]);

    return respond(200, { jira, confluence });
  } catch {
    return respond(502, { error: 'product request failed' });
  }
};
