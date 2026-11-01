import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { handler } from '../src/index';

const invocation = {
  call: { functionKey: 'getText', payload: { example: 'my-invoke-variable' } },
  context: { accountId: 'sensitive-invocation-context' },
};

const CONSOLE_METHODS = ['log', 'info', 'warn', 'error', 'debug'] as const;

// Spy on every console method so a new logging call cannot slip past the test.
beforeEach(() => {
  for (const method of CONSOLE_METHODS) {
    vi.spyOn(console, method).mockImplementation(() => {});
  }
});

afterEach(() => {
  vi.restoreAllMocks();
});

test('getText returns the greeting through the exported handler', async () => {
  await expect(handler(invocation)).resolves.toBe('Hello, world!');
});

test('getText does not log the invocation', async () => {
  await handler(invocation);

  for (const method of CONSOLE_METHODS) {
    expect(console[method]).not.toHaveBeenCalled();
  }
});

test('the handler rejects a function that is not defined', async () => {
  await expect(handler({ call: { functionKey: 'unknown' }, context: {} })).rejects.toThrow(
    "no definition for 'unknown'"
  );
});
