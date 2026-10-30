import globals from 'globals';

/* Lints the concatenated script (dist/app.js). The source files share one scope, so cross-file names are fine. */
export default [{
  files: ['dist/app.js'],
  languageOptions: { ecmaVersion: 2022, sourceType: 'script', globals: { ...globals.browser } },
  rules: {
    'no-undef': 'error', 'no-redeclare': 'error', 'no-dupe-keys': 'error', 'no-unreachable': 'error',
    'no-const-assign': 'error', 'no-unused-vars': ['warn', { args: 'none', caughtErrors: 'none' }],
  },
}];
