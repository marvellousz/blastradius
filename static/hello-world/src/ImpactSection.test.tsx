import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import ImpactSection from './ImpactSection';
import type { ChangedPath } from './analysis/impact';
import type { ServiceMap } from './analysis/serviceMap';
import { FAILURE, PullRequestLoadError } from './pullRequest';
import { loadServiceMap } from './serviceMapLoader';

// The real Bridge throws on import outside a Forge iframe.
vi.mock('@forge/bridge', () => ({}));

vi.mock('./serviceMapLoader', async () => ({
  ...(await vi.importActual<typeof import('./serviceMapLoader')>('./serviceMapLoader')),
  loadServiceMap: vi.fn(),
}));

const mockLoad = vi.mocked(loadServiceMap);

const MAP: ServiceMap = {
  version: 1,
  services: [
    { id: 'payment', name: 'Payment Service', owner: 'Payments Team', paths: ['services/payment/**'] },
    { id: 'checkout', name: 'Mobile Checkout', owner: null, paths: ['apps/checkout/**'] },
  ],
  dependencies: [{ from: 'checkout', to: 'payment', type: 'depends_on', note: null }],
};

const PAYMENT_FILE: ChangedPath = { path: 'services/payment/api.ts', previousPath: null };
const NOT_LOW_RISK = 'does not mean the pull request is low risk';

let container: HTMLDivElement;
let root: Root;

const renderImpact = async (files: ChangedPath[] = [PAYMENT_FILE], filesTruncated = false) => {
  await act(async () => {
    root.render(
      <ImpactSection destinationCommit="def456abc123" files={files} filesTruncated={filesTruncated} />
    );
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

test('loads the map from the destination commit', async () => {
  mockLoad.mockReturnValue(new Promise(() => {}));

  await renderImpact();

  expect(mockLoad).toHaveBeenCalledWith('def456abc123');
  expect(container.textContent).toContain('Loading service map...');
});

test('labels results as configured, not proven', async () => {
  mockLoad.mockResolvedValue({ status: 'loaded', map: MAP });

  await renderImpact();

  expect(container.textContent).toContain('not proven impact');
});

test('shows changed and downstream services with owners and routes', async () => {
  mockLoad.mockResolvedValue({ status: 'loaded', map: MAP });

  await renderImpact();

  expect(container.textContent).toContain('Payment Service (Payments Team, 1 changed file)');
  expect(container.textContent).toContain('Mobile Checkout (owner not configured): Mobile Checkout → Payment Service');
});

test('says when no downstream services are configured', async () => {
  mockLoad.mockResolvedValue({ status: 'loaded', map: { ...MAP, dependencies: [] } });

  await renderImpact();

  expect(container.textContent).toContain('No downstream services are configured');
});

test('never treats a missing map as low risk', async () => {
  mockLoad.mockResolvedValue({ status: 'not-configured' });

  await renderImpact();

  expect(container.textContent).toContain('impact is not configured');
  expect(container.textContent).toContain(NOT_LOW_RISK);
});

test('shows an invalid map as unknown, with its problems', async () => {
  mockLoad.mockResolvedValue({ status: 'invalid', problems: ['Service ids must be unique.'] });

  await renderImpact();

  const alert = container.querySelector('[role="alert"]');
  expect(alert?.textContent).toContain('impact is unknown');
  expect(alert?.textContent).toContain(NOT_LOW_RISK);
  expect(alert?.textContent).toContain('Service ids must be unique.');
});

test('a load failure keeps the heading and can be retried', async () => {
  mockLoad.mockRejectedValueOnce(new PullRequestLoadError(FAILURE.UNAVAILABLE));
  mockLoad.mockResolvedValueOnce({ status: 'loaded', map: MAP });

  await renderImpact();

  expect(container.textContent).toContain('Configured impact');
  expect(container.textContent).toContain(NOT_LOW_RISK);

  await act(async () => {
    container.querySelector('button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });

  expect(container.textContent).toContain('Payment Service');
});

test('unmapped files alone are unknown, not safe', async () => {
  mockLoad.mockResolvedValue({ status: 'loaded', map: MAP });

  await renderImpact([{ path: 'README.md', previousPath: null }]);

  expect(container.textContent).toContain('No changed files match a configured service');
  expect(container.textContent).toContain(NOT_LOW_RISK);
  expect(container.textContent).toContain('impact is unknown (1)');
  expect(container.textContent).toContain('README.md');
});

test('limits the unmapped list and counts the rest', async () => {
  mockLoad.mockResolvedValue({ status: 'loaded', map: MAP });
  const files = Array.from({ length: 25 }, (_, index) => ({
    path: `other/${index}.ts`,
    previousPath: null,
  }));

  await renderImpact(files);

  expect(container.textContent).toContain('impact is unknown (25)');
  expect(container.textContent).toContain('And 5 more.');
  expect(container.querySelectorAll('li')).toHaveLength(20);
});

test('warns that a truncated file list may miss services', async () => {
  mockLoad.mockResolvedValue({ status: 'loaded', map: MAP });

  await renderImpact([PAYMENT_FILE], true);

  expect(container.querySelector('[role="status"]')?.textContent).toContain('may miss affected services');
});

test('does not warn about truncation on a complete list', async () => {
  mockLoad.mockResolvedValue({ status: 'loaded', map: MAP });

  await renderImpact();

  expect(container.querySelector('[role="status"]')).toBeNull();
});
