/** @type {import('prettier').Config} */
export default {
  plugins: ['prettier-plugin-svelte'],
  semi: true,
  singleQuote: true,
  tabWidth: 2,
  useTabs: false,
  printWidth: 100,
  trailingComma: 'es5',
  overrides: [
    {
      files: '*.svelte',
      options: {
        parser: 'svelte',
      },
    },
  ],
};
