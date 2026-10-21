import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@sp/plugin-api': fileURLToPath(new URL('./vendor/plugin-api/index.ts', import.meta.url)),
    },
  },
  test: {
    include: ['test/**/*.test.ts'],
  },
});
