import js from '@eslint/js';
import react from 'eslint-plugin-react';
import hooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default [
  { ignores: ['dist'] },
  js.configs.recommended,
  {
    files: ['src/**/*.{js,jsx}'],
    languageOptions: { ecmaVersion: 2023, sourceType: 'module', globals: { ...globals.browser, ...globals.vitest }, parserOptions: { ecmaFeatures: { jsx: true } } },
    plugins: { react, 'react-hooks': hooks },
    settings: { react: { version: '18.3' } },
    rules: {
      ...hooks.configs.recommended.rules,
      'react/jsx-uses-vars': 'error', 'react/jsx-uses-react': 'off', 'react/jsx-no-undef': 'error',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_|^React$' }],
      'no-undef': 'error', 'react-hooks/exhaustive-deps': 'off',
    },
  },
  // Rebuilt screens and the design system are TypeScript: type-aware parsing, no `any` without a reason.
  ...tseslint.configs.recommended.map((c) => ({ ...c, files: ['src/**/*.{ts,tsx}'] })),
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser, ...globals.vitest } },
    plugins: { 'react-hooks': hooks },
    rules: { ...hooks.configs.recommended.rules, 'react-hooks/exhaustive-deps': 'off', '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }] },
  },
];
