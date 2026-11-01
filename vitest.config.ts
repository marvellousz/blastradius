import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // The frontend is a separate package with its own Vitest setup.
    include: ['tests/**/*.test.ts'],
  },
});
