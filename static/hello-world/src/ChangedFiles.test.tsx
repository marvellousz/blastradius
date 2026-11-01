import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import ChangedFiles from './ChangedFiles';
import { loadChangedFiles, type ChangedFile } from './changedFiles';
import { FAILURE, PullRequestLoadError } from './pullRequest';

// The real Bridge throws on import outside a Forge iframe.
vi.mock('@forge/bridge', () => ({}));

vi.mock('./changedFiles', async () => ({
  ...(await vi.importActual<typeof import('./changedFiles')>('./changedFiles')),
  loadChangedFiles: vi.fn(),
}));

const mockLoad = vi.mocked(loadChangedFiles);

const FILE: ChangedFile = {
  path: 'src/payment.ts',
  previousPath: null,
  status: 'modified',
  linesAdded: 4,
  linesRemoved: 2,
};

let container: HTMLDivElement;
let root: Root;

const renderChangedFiles = async () => {
  await act(async () => {
    root.render(<ChangedFiles />);
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

test('shows loading until the files arrive', async () => {
  mockLoad.mockReturnValue(new Promise(() => {}));

  await renderChangedFiles();

  expect(container.textContent).toBe('Loading changed files...');
});

test('lists each file with its status and line counts', async () => {
  mockLoad.mockResolvedValue({ files: [FILE], truncated: false });

  await renderChangedFiles();

  expect(container.textContent).toContain('Changed files (1)');
  expect(container.textContent).toContain('src/payment.ts (modified, +4 -2)');
  expect(container.querySelector('[role="status"]')).toBeNull();
});

test('shows both paths for a renamed file', async () => {
  mockLoad.mockResolvedValue({
    files: [{ ...FILE, path: 'src/new.ts', previousPath: 'src/old.ts', status: 'renamed' }],
    truncated: false,
  });

  await renderChangedFiles();

  expect(container.textContent).toContain('src/old.ts → src/new.ts (renamed');
});

test('does not show unknown line counts as zero', async () => {
  mockLoad.mockResolvedValue({
    files: [{ ...FILE, linesAdded: null, linesRemoved: null }],
    truncated: false,
  });

  await renderChangedFiles();

  expect(container.textContent).toContain('line counts unknown');
  expect(container.textContent).not.toContain('+0');
});

test('says the list is incomplete when truncated', async () => {
  mockLoad.mockResolvedValue({ files: [FILE], truncated: true });

  await renderChangedFiles();

  expect(container.textContent).toContain('Changed files (first 200)');
  expect(container.querySelector('[role="status"]')?.textContent).toContain('this list is incomplete');
});

test('reports an empty pull request plainly', async () => {
  mockLoad.mockResolvedValue({ files: [], truncated: false });

  await renderChangedFiles();

  expect(container.textContent).toContain('Bitbucket reported no changed files.');
});

test('a failure keeps the section heading and can be retried', async () => {
  mockLoad.mockRejectedValueOnce(new PullRequestLoadError(FAILURE.RATE_LIMITED));
  mockLoad.mockResolvedValueOnce({ files: [FILE], truncated: false });

  await renderChangedFiles();

  expect(container.textContent).toContain('Changed files');
  expect(container.textContent).toContain('limiting requests');
  expect(container.textContent).toContain('does not mean the pull request is low risk');

  await act(async () => {
    container.querySelector('button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });

  expect(container.textContent).toContain('src/payment.ts');
});
