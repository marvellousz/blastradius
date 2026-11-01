import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import ContractFindings from './ContractFindings';
import type { ContractResult } from './analysis/contract';
import type { ServiceMap } from './analysis/serviceMap';
import { loadContractEvidence } from './contractEvidence';
import { FAILURE, PullRequestLoadError } from './pullRequest';

// The real Bridge throws on import outside a Forge iframe.
vi.mock('@forge/bridge', () => ({}));

vi.mock('./contractEvidence', async () => ({
  ...(await vi.importActual<typeof import('./contractEvidence')>('./contractEvidence')),
  loadContractEvidence: vi.fn(),
}));

const mockLoad = vi.mocked(loadContractEvidence);

const service = (id: string, name: string) => ({
  id,
  name,
  owner: null,
  paths: [`${id}/**`],
  references: [],
});

const RESULT: ContractResult = {
  consumer: service('checkout', 'Mobile Checkout'),
  provider: service('payment', 'Payment Service'),
  contract: {
    file: 'services/payment/response.schema.json',
    fields: ['receiptUrl'],
    verification: 'Run the checkout payment response test',
  },
  status: 'breaking',
  changes: [{ field: 'receiptUrl', change: 'removed' }],
  reason: null,
};

const MAP: ServiceMap = { version: 1, services: [], dependencies: [] };

let container: HTMLDivElement;
let root: Root;

const renderFindings = async () => {
  await act(async () => {
    root.render(
      <ContractFindings map={MAP} files={[]} sourceCommit="abc123def456" destinationCommit="def456abc123" />
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

test('a breaking change shows severity, confidence, evidence, and the check', async () => {
  mockLoad.mockResolvedValue({ results: [RESULT], truncated: false });

  await renderFindings();

  expect(container.textContent).toContain('Mobile Checkout on Payment Service.');
  expect(container.textContent).toContain('Severity: High. Confidence: High.');
  expect(container.textContent).toContain('receiptUrl was removed');
  expect(container.textContent).toContain(
    'services/payment/response.schema.json compared at def456abc123 and abc123def456'
  );
  expect(container.textContent).toContain('Configured check: Run the checkout payment response test');
});

test('a clear result is limited to the declared fields', async () => {
  mockLoad.mockResolvedValue({
    results: [{ ...RESULT, status: 'clear', changes: [] }],
    truncated: false,
  });

  await renderFindings();

  expect(container.textContent).toContain('No declared field changed.');
  expect(container.textContent).toContain('does not rule out other impact');
  expect(container.textContent).not.toContain('Severity');
  expect(container.textContent).not.toContain('Configured check');
});

test('an unknown result shows no severity guess and gives its reason', async () => {
  mockLoad.mockResolvedValue({
    results: [{ ...RESULT, status: 'unknown', changes: [], reason: 'The schema uses features.' }],
    truncated: false,
  });

  await renderFindings();

  expect(container.textContent).toContain('Severity: Unknown. Confidence: Unknown.');
  expect(container.textContent).toContain('The schema uses features.');
});

test('a type change names both types', async () => {
  mockLoad.mockResolvedValue({
    results: [{
      ...RESULT,
      changes: [{ field: 'amount', change: 'type-changed', before: 'number', after: 'string' }],
    }],
    truncated: false,
  });

  await renderFindings();

  expect(container.textContent).toContain('amount changed type from number to string');
});

test('says when no contract file changed', async () => {
  mockLoad.mockResolvedValue({ results: [], truncated: false });

  await renderFindings();

  expect(container.textContent).toContain('No declared contract files changed.');
});

test('says when some contracts were not compared', async () => {
  mockLoad.mockResolvedValue({ results: [RESULT], truncated: true });

  await renderFindings();

  expect(container.querySelector('[role="status"]')?.textContent).toContain('some were not compared');
});

test('a load failure can be retried and is not read as low risk', async () => {
  mockLoad.mockRejectedValueOnce(new PullRequestLoadError(FAILURE.UNAVAILABLE));
  mockLoad.mockResolvedValueOnce({ results: [RESULT], truncated: false });

  await renderFindings();

  expect(container.textContent).toContain('does not mean the pull request is low risk');

  await act(async () => {
    container.querySelector('button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });

  expect(container.textContent).toContain('receiptUrl was removed');
});
