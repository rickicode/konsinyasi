import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    svelte({
      // Extend (not replace) the default include so every .svelte file is
      // still compiled, and additionally compile the router package's
      // uncompiled .svelte.js source shipped inside node_modules.
      include: [
        /\.svelte$/,
        /@keenmate\/svelte-spa-router\/.*\.svelte\.js$/,
      ],
    }),
  ],
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'src/shared'),
      $lib: resolve(__dirname, 'src/web/lib'),
    },
    conditions: ['browser'],
    dedupe: ['svelte'],
  },
  test: {
    server: {
      deps: {
        // Force vite-node to inline the router package so its .svelte.js files
        // go through the Svelte transform (avoids "link is not defined").
        inline: ['@keenmate/svelte-spa-router'],
      },
    },
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
