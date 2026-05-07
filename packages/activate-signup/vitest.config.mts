import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { coverageConfigDefaults, defineConfig } from 'vitest/config';

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@': dirname,
    },
  },
  test: {
    name: 'activate-signup',
    environment: 'node',
    exclude: ['**/.next/**', '**/storybook-static/**', '**/node_modules/**'],
    coverage: {
      exclude: [
        ...coverageConfigDefaults.exclude,
        '**/.next/**',
        '**/.storybook/**',
        '**/*.stories.*',
        '**/storybook-static/**',
        '**/node_modules/**',
        '**/*.mjs',
        '**/*.cjs',
      ],
    },
  },
});