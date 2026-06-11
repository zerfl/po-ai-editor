import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import prettier from 'eslint-plugin-prettier/recommended';

export default tseslint.config(
  // Global ignores
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/.turbo/**', '**/tsconfig.tsbuildinfo'],
  },

  // Base: recommended + strict type-checked for all TypeScript files
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Strict: no explicit any allowed
      '@typescript-eslint/no-explicit-any': 'error',

      // Vercel best practices alignment (type-checked rules)
      '@typescript-eslint/no-floating-promises': 'error', // async-parallel: always handle promises
      '@typescript-eslint/no-misused-promises': 'error', // async: don't pass async where sync expected
      '@typescript-eslint/require-await': 'warn', // async: don't mark functions async needlessly
      '@typescript-eslint/await-thenable': 'error', // async: only await actual promises
      '@typescript-eslint/no-unnecessary-condition': 'warn', // rendering: avoid dead code branches
      '@typescript-eslint/prefer-nullish-coalescing': 'warn', // js: prefer ?? over ||
    },
  },

  // apps/web: React rules
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      // React core
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules, // React 17+ automatic JSX transform

      // Hooks (enforces rules-of-hooks + exhaustive-deps)
      ...reactHooks.configs.recommended.rules,

      // HMR safety
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      // Vercel best practices: re-render optimization
      'react/jsx-no-bind': ['warn', { ignoreRefs: true, ignoreDOMComponents: true }],
      'react/no-unstable-nested-components': 'error', // rerender-no-inline-components
      'react/hook-use-state': 'warn', // clarity on useState usage
      'react/no-object-type-as-default-prop': 'warn', // rerender-memo-with-default-value
    },
  },

  // Prettier last — disables formatting rules that conflict
  prettier,
);
