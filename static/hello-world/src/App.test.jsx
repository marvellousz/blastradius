import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import App from './App';
import { FAILURE, loadPullRequest } from './pullRequest';

// The real Bridge throws on import outside a Forge iframe.
vi.mock('@forge/bridge', () => ({}));

// Replace only the loader. The failure categories stay real so the panel is
// tested against the same values the loader produces.
vi.mock('./pullRequest', async () => ({
  ...(await vi.importActual('./pullRequest')),
  loadPullRequest: vi.fn(),
}));

const PULL_REQUEST = {
  id: 1,
  title: 'Test BlastRadius panel',
  state: 'OPEN',
  author: 'Pat Example',
  sourceBranch: 'test-panel',
  destinationBranch: 'main',
  sourceCommit: 'abc123def456',
};

const failure = (kind) => Object.assign(new Error('raw detail'), { kind });

let container;
let root;

// Render inside act() so effects and promise callbacks settle before asserting.
const renderApp = async (element = <App />) => {
  await act(async () => {
    root.render(element);
  });
};

beforeEach(() => {
  loadPullRequest.mockReset();
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

test('shows loading until the pull request arrives', async () => {
  loadPullRequest.mockReturnValue(new Promise(() => {}));

  await renderApp();

  expect(container.textContent).toBe('Loading pull request...');
});

test('shows the real pull request details', async () => {
  loadPullRequest.mockResolvedValue(PULL_REQUEST);

  await renderApp();

  expect(container.textContent).toContain('Test BlastRadius panel');
  expect(container.textContent).toContain('Pull request #1 (OPEN)');
  expect(container.textContent).toContain('Author: Pat Example');
  expect(container.textContent).toContain('test-panel → main');
  expect(container.textContent).toContain('abc123def456');
});

test('states that no analysis has run', async () => {
  loadPullRequest.mockResolvedValue(PULL_REQUEST);

  await renderApp();

  expect(container.textContent).toContain('has not analyzed this pull request yet');
});

test('shows an unknown author as unknown', async () => {
  loadPullRequest.mockResolvedValue({ ...PULL_REQUEST, author: null });

  await renderApp();

  expect(container.textContent).toContain('Author: Unknown');
});

test.each(Object.values(FAILURE))('explains the %s failure without implying low risk', async (kind) => {
  loadPullRequest.mockRejectedValue(failure(kind));

  await renderApp();

  const alert = container.querySelector('[role="alert"]');
  expect(alert.textContent).toContain('does not mean the pull request is low risk');
  // A category with no message would leave only the low-risk sentence.
  expect(alert.textContent).not.toMatch(/^\s*This does not mean/);
  expect(alert.textContent).not.toContain('raw detail');
});

test('treats an unexpected error as unavailable', async () => {
  loadPullRequest.mockRejectedValue(new Error('raw detail'));

  await renderApp();

  expect(container.textContent).toContain('could not reach Bitbucket');
});

test('Retry loads again and shows the new result', async () => {
  loadPullRequest.mockRejectedValueOnce(failure(FAILURE.UNAVAILABLE));
  loadPullRequest.mockResolvedValueOnce(PULL_REQUEST);

  await renderApp();
  await act(async () => {
    container.querySelector('button').dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });

  expect(loadPullRequest).toHaveBeenCalledTimes(2);
  expect(container.querySelector('[role="alert"]')).toBeNull();
  expect(container.textContent).toContain('Test BlastRadius panel');
});

test('ignores a late response from a superseded load', async () => {
  const pendingLoads = [];
  loadPullRequest.mockImplementation(() => new Promise((resolve) => pendingLoads.push(resolve)));

  // StrictMode runs the effect twice in development, so two loads overlap.
  await renderApp(<React.StrictMode><App /></React.StrictMode>);
  await act(async () => {
    pendingLoads[1]({ ...PULL_REQUEST, title: 'Newest load' });
  });
  await act(async () => {
    pendingLoads[0]({ ...PULL_REQUEST, title: 'Stale load' });
  });

  expect(container.textContent).toContain('Newest load');
  expect(container.textContent).not.toContain('Stale load');
});
