import Resolver from '@forge/resolver';
import {
  clearConnection,
  parseConnection,
  readConnection,
  saveConnection,
  testConnection,
} from './connection';
import { getLiveContext } from './liveContext';
import { isWorkspaceOwner } from './workspaceAccess';

const resolver = new Resolver();

resolver.define('getLiveContext', ({ context }) => getLiveContext(context));

resolver.define('getConnectionStatus', async ({ context }) => {
  if (!(await isWorkspaceOwner(context.workspaceId))) {
    return { allowed: false };
  }

  // Report only whether a connection exists. The token never leaves the backend.
  return { allowed: true, connected: (await readConnection()) !== null };
});

resolver.define('saveConnection', async ({ context, payload }) => {
  if (!(await isWorkspaceOwner(context.workspaceId))) {
    return { result: 'forbidden' };
  }

  const connection = parseConnection(payload);

  if (!connection) {
    return { result: 'invalid' };
  }
  if (!(await testConnection(connection))) {
    return { result: 'unreachable' };
  }

  await saveConnection(connection);

  return { result: 'saved' };
});

resolver.define('clearConnection', async ({ context }) => {
  if (!(await isWorkspaceOwner(context.workspaceId))) {
    return { result: 'forbidden' };
  }

  await clearConnection();

  return { result: 'cleared' };
});

export const handler = resolver.getDefinitions();
