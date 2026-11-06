const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  { ignores: ['node_modules/'] },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: { ...globals.node },
    },
    rules: {
      // Express error handlers must declare 4 arguments, even if `next` is unused
      'no-unused-vars': ['error', { argsIgnorePattern: '^next$' }],
    },
  },
];
