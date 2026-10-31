/**
 * Resolver for the panel's frontend-to-backend round trip.
 *
 * It lives apart from index.js because @forge/resolver is a CommonJS package:
 * the default import in index.js relies on the interop in Forge's bundler and
 * fails under plain Node. Keeping the handler here lets tests run without Forge.
 *
 * Do not log the request argument. A Forge invocation carries user and
 * installation context, and project rules forbid writing it to the logs.
 *
 * @returns {string} The greeting shown in the panel.
 */
export const getText = () => 'Hello, world!';
