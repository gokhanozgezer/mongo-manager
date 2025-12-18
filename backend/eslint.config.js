import globals from 'globals';
import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.es2021
      }
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': 'off',
      'semi': 'off',
      'quotes': 'off',
      'indent': 'off',
      'no-multiple-empty-lines': 'off',
      'eol-last': 'off',
      'comma-dangle': 'off',
      'object-curly-spacing': 'off',
      'array-bracket-spacing': 'off',
      'space-before-blocks': 'off',
      'keyword-spacing': 'off',
      'space-infix-ops': 'off',
      'eqeqeq': ['warn', 'always'],
      'no-var': 'error',
      'prefer-const': 'warn',
      'no-empty': 'warn'
    }
  },
  {
    ignores: ['node_modules/**']
  }
];
