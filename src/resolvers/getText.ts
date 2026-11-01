/**
 * Resolver for a frontend-to-backend round trip. The panel no longer calls it;
 * it stays until the first real resolver replaces it (ADR-014).
 *
 * Do not log the request argument. A Forge invocation carries user and
 * installation context, and project rules forbid writing it to the logs.
 */
export const getText = (): string => 'Hello, world!';
