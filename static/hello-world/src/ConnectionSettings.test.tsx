import { invoke } from '@forge/bridge';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import ConnectionSettings from './ConnectionSettings';

vi.mock('@forge/bridge', () => ({ invoke: vi.fn() }));

const mockInvoke = vi.mocked(invoke);

let container: HTMLDivElement;
let root: Root;

const answer = (replies: Record<string, unknown>) => {
  mockInvoke.mockImplementation(async (name: string) => replies[name]);
};

const renderSettings = async () => {
  await act(async () => {
    root.render(<ConnectionSettings />);
  });
};

const type = (input: HTMLInputElement, value: string) => {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
};

const inputs = () => container.querySelectorAll('input');

const submit = async () => {
  await act(async () => {
    const [url, token] = inputs();

    if (url && token) {
      type(url, ' https://x.webtrigger.atlassian.app/public/a ');
      type(token, ` ${'a'.repeat(64)} `);
    }
  });
  await act(async () => {
    container.querySelector('form')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  });
};

beforeEach(() => {
  mockInvoke.mockReset();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => {
    root.unmount();
  });
  container.remove();
});

test('non-owners see no form', async () => {
  answer({ getConnectionStatus: { allowed: false } });

  await renderSettings();

  expect(container.textContent).toContain('Only workspace owners');
  expect(container.querySelector('form')).toBeNull();
});

test('explains that the connection is optional and what readers can see', async () => {
  answer({ getConnectionStatus: { allowed: true, connected: false } });

  await renderSettings();

  expect(container.textContent).toContain('Optional');
  expect(container.textContent).toContain('even without access to those items');
  expect(container.textContent).toContain('Not connected.');
});

test('masks the token field', async () => {
  answer({ getConnectionStatus: { allowed: true, connected: false } });

  await renderSettings();

  expect(inputs()[1]?.type).toBe('password');
});

test('saves trimmed values and clears the token field', async () => {
  answer({ getConnectionStatus: { allowed: true, connected: false }, saveConnection: { result: 'saved' } });

  await renderSettings();
  await submit();

  expect(mockInvoke).toHaveBeenCalledWith('saveConnection', {
    url: 'https://x.webtrigger.atlassian.app/public/a',
    token: 'a'.repeat(64),
  });
  expect(inputs()[1]?.value).toBe('');
});

test.each([
  ['invalid', 'Check the URL and token'],
  ['unreachable', 'did not accept'],
  ['forbidden', 'Only workspace owners'],
  ['something-else', 'Something went wrong'],
])('reports a %s result', async (result, message) => {
  answer({ getConnectionStatus: { allowed: true, connected: false }, saveConnection: { result } });

  await renderSettings();
  await submit();

  expect(container.textContent).toContain(message);
});

test('offers Disconnect only when connected', async () => {
  answer({ getConnectionStatus: { allowed: true, connected: false } });

  await renderSettings();

  expect(container.textContent).not.toContain('Disconnect');
});

test('Disconnect clears the connection', async () => {
  answer({ getConnectionStatus: { allowed: true, connected: true }, clearConnection: { result: 'cleared' } });

  await renderSettings();
  await act(async () => {
    container.querySelector<HTMLButtonElement>('button[type="button"]')?.click();
  });

  expect(mockInvoke).toHaveBeenCalledWith('clearConnection');
});

test('a load failure is reported', async () => {
  mockInvoke.mockRejectedValue(new Error('down'));

  await renderSettings();

  expect(container.querySelector('[role="alert"]')?.textContent).toContain('could not load');
});
