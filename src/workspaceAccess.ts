import api, { route } from '@forge/api';
import { readField } from '../static/hello-world/src/validation';

const BARE_UUID = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

// The REST API needs UUIDs in curly braces, and Forge's docs do not state whether
// workspaceId already has them, so accept both forms.
export const toWorkspaceParam = (workspaceId: string) =>
  BARE_UUID.test(workspaceId) ? `{${workspaceId}}` : workspaceId;

/**
 * Checks, as the current user, that they own the workspace. The connection
 * decides where data is read from, and the docs do not say settings pages are
 * limited to admins, so every change is checked here and fails closed.
 */
export const isWorkspaceOwner = async (workspaceId: unknown): Promise<boolean> => {
  if (typeof workspaceId !== 'string' || workspaceId.length === 0) {
    return false;
  }

  const response = await api.asUser().requestBitbucket(
    route`/2.0/user/workspaces/${toWorkspaceParam(workspaceId)}/permission`
  );

  return response.ok && readField(await response.json(), 'permission') === 'owner';
};
