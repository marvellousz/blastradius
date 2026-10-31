import React from 'react';
import ReactDOM from 'react-dom';
import { act } from 'react-dom/test-utils';
import { invoke } from '@forge/bridge';
import App from './App';

// The Bridge only works inside a Forge iframe, so tests replace it.
jest.mock('@forge/bridge', () => ({ invoke: jest.fn() }));

let container;

// Render inside act() so effects and promise callbacks settle before asserting.
const renderApp = async () => {
  await act(async () => {
    ReactDOM.render(<App />, container);
  });
};

beforeEach(() => {
  invoke.mockReset();
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  ReactDOM.unmountComponentAtNode(container);
  container.remove();
});

test('shows loading until the resolver responds', async () => {
  invoke.mockReturnValue(new Promise(() => {}));

  await renderApp();

  expect(container.textContent).toBe('Loading...');
});

test('shows the resolver response', async () => {
  invoke.mockResolvedValue('Hello, world!');

  await renderApp();

  expect(invoke).toHaveBeenCalledWith('getText', { example: 'my-invoke-variable' });
  expect(container.textContent).toBe('Hello, world!');
});

test('shows a visible error, not a result, when the resolver call fails', async () => {
  invoke.mockRejectedValue(new Error('invoke failed'));

  await renderApp();

  expect(container.querySelector('[role="alert"]')).not.toBeNull();
  expect(container.textContent).toContain('does not mean the pull request is low risk');
  expect(container.textContent).not.toContain('invoke failed');
});

test('Retry calls the resolver again and shows the new result', async () => {
  invoke.mockRejectedValueOnce(new Error('invoke failed'));
  invoke.mockResolvedValueOnce('Hello, world!');

  await renderApp();
  await act(async () => {
    container.querySelector('button').dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });

  expect(invoke).toHaveBeenCalledTimes(2);
  expect(container.querySelector('[role="alert"]')).toBeNull();
  expect(container.textContent).toBe('Hello, world!');
});

test('ignores a response that arrives after unmount', async () => {
  let resolveInvoke;
  invoke.mockReturnValue(new Promise((resolve) => { resolveInvoke = resolve; }));
  const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

  await renderApp();
  ReactDOM.unmountComponentAtNode(container);
  await act(async () => {
    resolveInvoke('late response');
  });

  expect(consoleError).not.toHaveBeenCalled();
  consoleError.mockRestore();
});
