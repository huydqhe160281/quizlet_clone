import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    exclude: ['**/node_modules/**', '**/tests/e2e/**', '**/.agent/**'],
    coverage: {
      provider: 'v8',
      include: [
        'src/features/study/lib/sm2.ts',
        'src/lib/utils/fuzzy.ts',
        'src/server/services/sets/set.service.ts',
        'src/server/services/user/stats.service.ts',
        'src/server/services/study/study.service.ts',
      ],
      exclude: ['**/*.test.ts', '**/*.d.ts'],
      thresholds: {
        'src/features/study/lib/sm2.ts': {
          lines: 80,
          functions: 80,
          branches: 80,
          statements: 80,
        },
        'src/lib/utils/fuzzy.ts': {
          lines: 80,
          functions: 80,
          branches: 80,
          statements: 80,
        },
        'src/server/services/sets/set.service.ts': {
          lines: 80,
          functions: 80,
          branches: 45,
          statements: 80,
        },
        'src/server/services/user/stats.service.ts': {
          lines: 80,
          functions: 80,
          branches: 65,
          statements: 80,
        },
        'src/server/services/study/study.service.ts': {
          lines: 80,
          functions: 80,
          branches: 65,
          statements: 80,
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
