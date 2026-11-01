import api, { route, webTrigger } from '@forge/api';
import Resolver from '@forge/resolver';
import { hasToken, rotateToken } from '../token';

const TRIGGER_KEY = 'blastradius-companion-read';

// A token unlocks data for anyone holding it. The docs do not say admin pages
// are limited to admins, so every resolver checks, as the user, and fails closed.
const isJiraAdmin = async (): Promise<boolean> => {
  const response = await api.asUser().requestJira(route`/rest/api/3/mypermissions?permissions=ADMINISTER`);

  if (!response.ok) {
    return false;
  }

  const body = await response.json();

  return body.permissions?.ADMINISTER?.havePermission === true;
};

const resolver = new Resolver();

resolver.define('getConnection', async () => {
  if (!(await isJiraAdmin())) {
    return { allowed: false };
  }

  return {
    allowed: true,
    url: await webTrigger.getUrl(TRIGGER_KEY),
    hasToken: await hasToken(),
  };
});

resolver.define('createToken', async () => {
  if (!(await isJiraAdmin())) {
    return { allowed: false };
  }

  return { allowed: true, token: await rotateToken() };
});

export const handler = resolver.getDefinitions();
