import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';

const reactHooksConfig = reactHooksPlugin.configs.flat.recommended;

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    ...reactPlugin.configs.flat.recommended,
    rules: {
      ...reactPlugin.configs.flat.recommended.rules,
      ...reactHooksConfig.rules,
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react/display-name': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/immutability': 'off',
    },
    plugins: {
      ...reactPlugin.configs.flat.recommended.plugins,
      ...reactHooksConfig.plugins,
    },
    settings: {
      react: { version: '19.0' },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    files: ['apps/api/src/config/logger.ts'],
    rules: {
      'no-console': 'off',
    },
  },
  {
    ignores: ['**/node_modules/**', '**/dist/**', '**/.next/**', '**/eslint.config.mjs', '**/next-env.d.ts'],
  },
);
