import { router } from '@forge/bridge';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import ExternalLink from './ExternalLink';

vi.mock('@forge/bridge', () => ({ router: { open: vi.fn() } }));

const mockOpen = vi.mocked(router.open);
const URL_TO_OPEN = 'https://acme.atlassian.net/wiki/x/1';

let container: HTMLDivElement;
let root: Root;

const clickLink = async (init: MouseEventInit = {}) => {
  const event = new MouseEvent('click', { bubbles: true, cancelable: true, ...init });

  await act(async () => {
    container.querySelector('a')?.dispatchEvent(event);
  });

  return event;
};

beforeEach(async () => {
  mockOpen.mockReset().mockResolvedValue(undefined);
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root.render(<ExternalLink href={URL_TO_OPEN}>Contract</ExternalLink>);
  });
});

afterEach(async () => {
  await act(async () => {
    root.unmount();
  });
  container.remove();
});

test('renders a real link', () => {
  const link = container.querySelector('a');

  expect(link?.getAttribute('href')).toBe(URL_TO_OPEN);
  expect(link?.getAttribute('rel')).toBe('noreferrer');
  expect(link?.textContent).toBe('Contract');
});

test('a plain click opens through the Forge router', async () => {
  const event = await clickLink();

  expect(mockOpen).toHaveBeenCalledWith(URL_TO_OPEN);
  expect(event.defaultPrevented).toBe(true);
});

test.each([
  ['Ctrl', { ctrlKey: true }],
  ['Cmd', { metaKey: true }],
  ['Shift', { shiftKey: true }],
])('a %s click stays with the browser', async (_name, init) => {
  const event = await clickLink(init);

  expect(mockOpen).not.toHaveBeenCalled();
  expect(event.defaultPrevented).toBe(false);
});

test('a declined navigation is handled', async () => {
  const declined = Promise.reject(new Error('declined'));
  const handler = vi.spyOn(declined, 'catch');
  mockOpen.mockReturnValue(declined);

  await clickLink();

  expect(handler).toHaveBeenCalled();
});
