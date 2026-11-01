import { kvs } from '@forge/kvs';
import { randomBytes, timingSafeEqual } from 'node:crypto';

const TOKEN_KEY = 'connection-token';

/**
 * Creates a token, replacing any existing one, so an admin can cut off an old
 * connection. It is returned once for the admin to copy, and never logged.
 */
export const rotateToken = async (): Promise<string> => {
  const token = randomBytes(32).toString('hex');

  await kvs.setSecret(TOKEN_KEY, token);

  return token;
};

export const hasToken = async (): Promise<boolean> => typeof (await kvs.getSecret(TOKEN_KEY)) === 'string';

// Fails closed: without a stored token, every request is refused.
export const isAuthorized = async (header: unknown): Promise<boolean> => {
  const expected = await kvs.getSecret(TOKEN_KEY);

  if (typeof expected !== 'string' || typeof header !== 'string') {
    return false;
  }

  const left = Buffer.from(header);
  const right = Buffer.from(`Bearer ${expected}`);

  return left.length === right.length && timingSafeEqual(left, right);
};
