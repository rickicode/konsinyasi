import js from '@eslint/js';
import ts from 'typescript-eslint';
import svelte from 'eslint-plugin-svelte';
import prettier from 'eslint-config-prettier';

/** @type {import('eslint').Linter.Config[]} */
export default [
  js.configs.recommended,
  ...ts.configs.recommended,
  ...svelte.configs['flat/recommended'],
  prettier,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    linterOptions: {
      reportUnusedDisableDirectives: true,
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: ts.parser,
      parserOptions: {
        extraFileExtensions: ['.svelte'],
      },
    },
  },
  {
    ignores: [
      'dist/',
      '.wrangler/',
      'node_modules/',
      '.git/',
      '.pi/',
      '.basic-memory/',
      '.openlore/',
      'src/web/App.svelte',
      'src/web/app.css',
      'src/web/pages/*',
      'src/web/lib/*',
      'src/web/components/*',
    ],
  },
];
