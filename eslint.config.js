import js from '@eslint/js';
import ts from 'typescript-eslint';
import svelte from 'eslint-plugin-svelte';
import svelteParser from 'svelte-eslint-parser';
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
    rules: {
      'no-undef': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['**/*.svelte'],
    languageOptions: {
      parser: svelteParser,
      parserOptions: {
        parser: ts.parser,
        sourceType: 'module',
      },
    },
  },
  {
    files: ['**/*.svelte.ts'],
    languageOptions: {
      parser: ts.parser,
      parserOptions: {
        sourceType: 'module',
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
      'src/web/pages/*',
      'src/web/lib/api.ts',
      'src/web/lib/photo.ts',
      'src/web/lib/role.ts',
      'src/web/lib/router.ts',
      'src/web/lib/visit.ts',
      'src/web/components/*',
    ],
  },
];
