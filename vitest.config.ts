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
    projects: [
      {
        extends: true,
        test: {
          name: 'node',
          environment: 'node',
          include: ['src/worker/**/*.test.ts', 'src/shared/**/*.test.ts', 'src/web/**/*.test.ts'],
          exclude: ['src/web/**/*.spec.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'jsdom',
          environment: 'jsdom',
          include: ['src/web/**/*.spec.ts'],
        },
      },
    ],
  },
});
