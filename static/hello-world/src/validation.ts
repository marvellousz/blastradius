const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const isText = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0;

// Forge's context and Bitbucket's responses are external data, so they stay
// `unknown` until each value has been checked.
export const readField = (source: unknown, ...path: string[]): unknown =>
  path.reduce<unknown>((value, key) => (isRecord(value) ? value[key] : undefined), source);
