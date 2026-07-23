import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [svelte()],
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'src/shared'),
      $lib: resolve(__dirname, 'src/web/lib'),
    },
    conditions: ['browser'],
  },
  test: {
    environment: 'node',
    globals: false,
    include: [
      'src/worker/**/*.test.ts',
      'src/web/**/*.test.ts',
      'src/web/**/*.spec.ts',
      'src/web/lib/__tests__/*.test.ts',
      'src/shared/**/*.test.ts',
    ],
    environmentMatchGlobs: [
      ['src/worker/**', 'node'],
      ['src/web/**/*.spec.ts', 'jsdom'],
      ['src/web/lib/__tests__/*.test.ts', 'node'],
      ['src/shared/**', 'node'],
    ],
  },
});
