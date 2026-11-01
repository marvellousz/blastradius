import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import Root from './Root';

import '@atlaskit/css-reset';

const container = document.getElementById('root');

if (!container) {
  throw new Error('The panel page is missing its root element.');
}

createRoot(container).render(
  <StrictMode>
    <Root />
  </StrictMode>
);
