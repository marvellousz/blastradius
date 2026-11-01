import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import ConfiguredReferences from './ConfiguredReferences';
import type { LiveContext } from './analysis/liveContext';
import type { Service } from './analysis/serviceMap';
import { loadLiveContext } from './liveContextLoader';

// The real Bridge throws on import outside a Forge iframe.
vi.mock('@forge/bridge', () => ({}));

vi.mock('./liveContextLoader', () => ({ loadLiveContext: vi.fn() }));

const mockLoad = vi.mocked(loadLiveContext);

const PAGE_URL = 'https://acme.atlassian.net/wiki/pages/viewpage.action?pageId=98307';

const SERVICE: Service = {
  id: 'payment',
  name: 'Payment Service',
  owner: null,
  paths: ['a/**'],
  references: [
    { type: 'jira', key: 'KAN-4', title: 'Map title' },
    { type: 'confluence', url: PAGE_URL, title: 'Map page' },
  ],
};

const LIVE: LiveContext = {
  status: 'ok',
  jira: [{ key: 'KAN-4', title: 'Live title', status: 'To Do' }],
  confluence: [{ id: '98307', title: 'Live page', version: 3, excerpt: 'Must include receiptUrl.' }],
};

let container: HTMLDivElement;
let root: Root;

const renderReferences = async (live: LiveContext, services: Service[] = [SERVICE]) => {
  mockLoad.mockResolvedValue(live);

  await act(async () => {
    root.render(<ConfiguredReferences services={services} />);
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

test('without a connection, shows configured references as not fetched', async () => {
  await renderReferences({ status: 'not-connected' });

  expect(container.textContent).toContain('were not fetched from Jira or Confluence');
  expect(container.textContent).toContain('KAN-4: Map title (Payment Service)');
  expect(container.textContent).not.toContain('Live:');
});

test('shows live data, marked, in place of map text', async () => {
  await renderReferences(LIVE);

  expect(container.textContent).toContain('Live: KAN-4: Live title (To Do) (Payment Service)');
  expect(container.textContent).toContain('Live: Live page, version 3 (Payment Service)');
  expect(container.textContent).toContain('Must include receiptUrl.');
  expect(container.textContent).not.toContain('Map title');
});

test('says live data did not use the viewer\'s own access', async () => {
  await renderReferences(LIVE);

  expect(container.textContent).toContain('not with your own access');
});

test('falls back to the map, unmarked, when an item was not returned', async () => {
  await renderReferences({ status: 'ok', jira: [], confluence: [] });

  expect(container.textContent).toContain('KAN-4: Map title (Payment Service)');
  expect(container.textContent).not.toContain('Live:');
});

test('says when the connected app could not read an item', async () => {
  await renderReferences({
    status: 'ok',
    jira: [{ key: 'KAN-4', title: null, status: null }],
    confluence: [{ id: '98307', title: null, version: null, excerpt: null }],
  });

  expect(container.textContent).toContain('could not read this item');
  expect(container.textContent).toContain('could not read this page');
  expect(container.textContent).not.toContain('Live:');
});

test('says when live data is unavailable, and keeps the map', async () => {
  await renderReferences({ status: 'unavailable' });

  expect(container.textContent).toContain('Live data is unavailable');
  expect(container.textContent).toContain('KAN-4: Map title');
});

test('renders nothing when no reference applies', async () => {
  await renderReferences(LIVE, [{ ...SERVICE, references: [] }]);

  expect(container.textContent).toBe('');
});
