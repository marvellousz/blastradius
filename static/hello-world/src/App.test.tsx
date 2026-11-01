import { StrictMode, act, type ReactElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import App from './App';
import {
  FAILURE,
  PullRequestLoadError,
  loadPullRequest,
  type PullRequestSummary,
} from './pullRequest';

// The real Bridge throws on import outside a Forge iframe.
vi.mock('@forge/bridge', () => ({}));

// Replace only the loader. The failure categories stay real so the panel is
// tested against the same values the loader produces.
vi.mock('./pullRequest', async () => ({
  ...(await vi.importActual<typeof import('./pullRequest')>('./pullRequest')),
  loadPullRequest: vi.fn(),
}));

// The changed files section has its own tests, so it stays loading here.
vi.mock('./changedFiles', () => ({
  loadChangedFiles: () => new Promise(() => {}),
}));

const mockLoad = vi.mocked(loadPullRequest);

const PULL_REQUEST: PullRequestSummary = {
  id: 1,
  title: 'Test BlastRadius panel',
  state: 'OPEN',
  author: 'Pat Example',
  sourceBranch: 'test-panel',
  destinationBranch: 'main',
  sourceCommit: 'abc123def456',
};

let container: HTMLDivElement;
let root: Root;

// Render inside act() so effects and promise callbacks settle before asserting.
const renderApp = async (element: ReactElement = <App />) => {
  await act(async () => {
    root.render(element);
  });
};

beforeEach(() => {
  mockLoad.mockReset();
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
  mockLoad.mockReturnValue(new Promise(() => {}));

  await renderApp();

  expect(container.textContent).toBe('Loading pull request...');
});

test('shows the real pull request details', async () => {
  mockLoad.mockResolvedValue(PULL_REQUEST);

  await renderApp();

  expect(container.textContent).toContain('Test BlastRadius panel');
  expect(container.textContent).toContain('Pull request #1 (OPEN)');
  expect(container.textContent).toContain('Author: Pat Example');
  expect(container.textContent).toContain('test-panel → main');
  expect(container.textContent).toContain('abc123def456');
});

test('states that no analysis has run', async () => {
  mockLoad.mockResolvedValue(PULL_REQUEST);

  await renderApp();

  expect(container.textContent).toContain('has not analyzed this pull request yet');
});

test('shows an unknown author as unknown', async () => {
  mockLoad.mockResolvedValue({ ...PULL_REQUEST, author: null });

  await renderApp();

  expect(container.textContent).toContain('Author: Unknown');
});

test.each([
  [FAILURE.CONTEXT, 'could not identify this pull request'],
  [FAILURE.DENIED, 'Bitbucket denied access'],
  [FAILURE.NOT_FOUND, 'could not find this pull request'],
  [FAILURE.RATE_LIMITED, 'limiting requests'],
  [FAILURE.UNAVAILABLE, 'could not reach Bitbucket'],
  [FAILURE.MALFORMED, 'could not read'],
])('explains the %s failure without implying low risk', async (kind, explanation) => {
  mockLoad.mockRejectedValue(new PullRequestLoadError(kind));

  await renderApp();

  const alert = container.querySelector('[role="alert"]');
  expect(alert?.textContent).toContain(explanation);
  expect(alert?.textContent).toContain('does not mean the pull request is low risk');
});

test('treats an unexpected error as unavailable, without showing its detail', async () => {
  mockLoad.mockRejectedValue(new Error('raw detail'));

  await renderApp();

  expect(container.textContent).toContain('could not reach Bitbucket');
  expect(container.textContent).not.toContain('raw detail');
});

test('Retry loads again and shows the new result', async () => {
  mockLoad.mockRejectedValueOnce(new PullRequestLoadError(FAILURE.UNAVAILABLE));
  mockLoad.mockResolvedValueOnce(PULL_REQUEST);

  await renderApp();
  await act(async () => {
    container.querySelector('button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });

  expect(mockLoad).toHaveBeenCalledTimes(2);
  expect(container.querySelector('[role="alert"]')).toBeNull();
  expect(container.textContent).toContain('Test BlastRadius panel');
});

test('ignores a late response from a superseded load', async () => {
  const pendingLoads: Array<(summary: PullRequestSummary) => void> = [];
  mockLoad.mockImplementation(
    () => new Promise((resolve) => {
      pendingLoads.push(resolve);
    })
  );

  // StrictMode runs the effect twice in development, so two loads overlap.
  await renderApp(<StrictMode><App /></StrictMode>);
  await act(async () => {
    pendingLoads[1]?.({ ...PULL_REQUEST, title: 'Newest load' });
  });
  await act(async () => {
    pendingLoads[0]?.({ ...PULL_REQUEST, title: 'Stale load' });
  });

  expect(container.textContent).toContain('Newest load');
  expect(container.textContent).not.toContain('Stale load');
});
