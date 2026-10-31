import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import { createRequire } from 'node:module';
import { getText } from '../src/resolvers/getText.js';

// require() returns the package's real CommonJS exports, so the class is on
// `.default`. Forge's bundler hides this difference in src/index.js.
const require = createRequire(import.meta.url);
const Resolver = require('@forge/resolver').default;

// Build the same dispatcher that src/index.js exports, using the real package.
const buildHandler = () => {
  const resolver = new Resolver();
  resolver.define('getText', getText);
  return resolver.getDefinitions();
};

const SENSITIVE_MARKER = 'sensitive-invocation-context';
const invocation = {
  call: { functionKey: 'getText', payload: { example: 'my-invoke-variable' } },
  context: { accountId: SENSITIVE_MARKER },
};

let logged;
const originals = {};

// Capture every console method so a new logging call cannot slip past the test.
beforeEach(() => {
  logged = [];
  for (const method of ['log', 'info', 'warn', 'error', 'debug']) {
    originals[method] = console[method];
    console[method] = (...args) => logged.push(args);
  }
});

afterEach(() => {
  Object.assign(console, originals);
});

test('getText returns the greeting through the real resolver dispatcher', async () => {
  assert.equal(await buildHandler()(invocation), 'Hello, world!');
});

test('getText does not log the invocation', async () => {
  await buildHandler()(invocation);

  assert.deepEqual(logged, []);
});

test('the dispatcher rejects a function that is not defined', async () => {
  await assert.rejects(
    buildHandler()({ call: { functionKey: 'unknown' }, context: {} }),
    /no definition for 'unknown'/,
  );
});
