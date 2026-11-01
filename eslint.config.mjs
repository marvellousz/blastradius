import { defineConfig } from 'eslint/config';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default defineConfig(
  { ignores: ['**/node_modules/', '**/build/', '.forge/'] },
  // Includes the bans on `any`, non-null assertions, and @ts- comments.
  tseslint.configs.strict,
  {
    files: ['static/hello-world/src/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
    },
  }
);
