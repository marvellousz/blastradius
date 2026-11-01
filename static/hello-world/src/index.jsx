import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

import '@atlaskit/css-reset';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
