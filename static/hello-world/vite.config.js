import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Forge serves the resource from a nested path, so asset URLs must be relative.
  base: './',
  plugins: [react()],
  // Must match the `main` resource path in manifest.yml.
  build: { outDir: 'build' },
  test: {
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
  },
});
