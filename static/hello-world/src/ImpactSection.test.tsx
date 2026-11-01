import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import ImpactSection from './ImpactSection';
import type { ChangedPath } from './analysis/impact';
import type { Service, ServiceMap } from './analysis/serviceMap';
import { loadContractEvidence } from './contractEvidence';
import { FAILURE, PullRequestLoadError } from './pullRequest';
import { loadServiceMap } from './serviceMapLoader';

// The real Bridge throws on import outside a Forge iframe.
vi.mock('@forge/bridge', () => ({}));

vi.mock('./serviceMapLoader', async () => ({
  ...(await vi.importActual<typeof import('./serviceMapLoader')>('./serviceMapLoader')),
  loadServiceMap: vi.fn(),
}));

// The graph and contract findings have their own tests. These stubs record what they receive.
vi.mock('./ImpactGraph', () => ({
  default: ({ results }: { results: unknown[] }) => <p>Graph with {results.length} results</p>,
}));

vi.mock('./ContractFindings', () => ({
  default: ({ commits }: { commits: string }) => <p>Contracts for {commits}</p>,
}));

vi.mock('./contractEvidence', () => ({ loadContractEvidence: vi.fn() }));

const mockLoad = vi.mocked(loadServiceMap);
const mockEvidence = vi.mocked(loadContractEvidence);

const PAYMENT: Service = {
  id: 'payment',
  name: 'Payment Service',
  owner: 'Payments Team',
  paths: ['services/payment/**'],
  references: [
    { type: 'jira', key: 'KAN-4', title: 'Refactors must preserve checkout compatibility' },
    { type: 'confluence', url: 'https://acme.atlassian.net/wiki/x/1', title: 'Checkout API Contract' },
  ],
};

const CHECKOUT: Service = {
  id: 'checkout',
  name: 'Mobile Checkout',
  owner: null,
  paths: ['apps/checkout/**'],
  references: [],
};

const MAP: ServiceMap = {
  version: 1,
  services: [PAYMENT, CHECKOUT],
  dependencies: [{ from: 'checkout', to: 'payment', type: 'depends_on', note: null, contract: null }],
};

const PAYMENT_FILE: ChangedPath = { path: 'services/payment/api.ts', previousPath: null };
const NOT_LOW_RISK = 'does not mean the pull request is low risk';

let container: HTMLDivElement;
let root: Root;

const renderImpact = async (files: ChangedPath[] = [PAYMENT_FILE], filesTruncated = false) => {
  await act(async () => {
    root.render(
      <ImpactSection
        sourceCommit="abc123def456"
        destinationCommit="def456abc123"
        files={files}
        filesTruncated={filesTruncated}
      />
    );
  });
};

beforeEach(() => {
  mockLoad.mockReset();
  mockEvidence.mockReset().mockResolvedValue({ results: [], truncated: false });
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

test('loads contract evidence once, for both commits', async () => {
  mockLoad.mockResolvedValue({ status: 'loaded', map: MAP });

  await renderImpact();

  expect(mockEvidence).toHaveBeenCalledTimes(1);
  expect(mockEvidence).toHaveBeenCalledWith(MAP, [PAYMENT_FILE], 'abc123def456', 'def456abc123');
  expect(container.textContent).toContain('Contracts for def456abc123 and abc123def456');
});

test('the graph receives contract results once they load', async () => {
  mockLoad.mockResolvedValue({ status: 'loaded', map: MAP });
  mockEvidence.mockResolvedValue({
    results: [{
      consumer: CHECKOUT,
      provider: PAYMENT,
      contract: { file: 'a.json', fields: ['a'], verification: null },
      status: 'breaking',
      changes: [],
      reason: null,
    }],
    truncated: false,
  });

  await renderImpact();

  expect(container.textContent).toContain('Graph with 1 results');
});

test('shows changed and downstream services with owners and routes', async () => {
  mockLoad.mockResolvedValue({ status: 'loaded', map: MAP });

  await renderImpact();

  expect(container.textContent).toContain('Payment Service (Payments Team, 1 changed file)');
  expect(container.textContent).toContain('Mobile Checkout (owner not configured): Mobile Checkout → Payment Service');
});

test('labels configured references as not fetched', async () => {
  mockLoad.mockResolvedValue({ status: 'loaded', map: MAP });

  await renderImpact();

  expect(container.textContent).toContain('not fetched from Jira or Confluence');
  expect(container.textContent).toContain('KAN-4: Refactors must preserve checkout compatibility (Payment Service)');
  expect(container.querySelector('a')?.getAttribute('href')).toBe('https://acme.atlassian.net/wiki/x/1');
});

test('hides references for services this change does not touch', async () => {
  mockLoad.mockResolvedValue({ status: 'loaded', map: MAP });

  await renderImpact([{ path: 'apps/checkout/app.ts', previousPath: null }]);

  expect(container.textContent).not.toContain('KAN-4');
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
