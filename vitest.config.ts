import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  resolve: {
    alias: {
      // The repo uses `@/lib/*`, `@/utils/*`, `@/models/*`, `@/hooks/*` etc.
      // A single `@` -> repo-root alias resolves all of them.
      '@': fileURLToPath(new URL('./', import.meta.url)),
      // Some routes use bare `models/...` imports (tsconfig baseUrl: ".").
      // Vitest doesn't pick up tsconfig baseUrl, so we alias it explicitly.
      'models': fileURLToPath(new URL('./models', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test/setup.ts'],
    include: ['**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', '.next', 'e2e', 'dist'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'html'],
      reportsDirectory: './coverage',
      include: [
        'lib/**/*.ts',
        'utils/**/*.ts',
        'models/**/*.ts',
        'hooks/**/*.{ts,tsx}',
        'app/api/**/*.ts',
        'middleware.ts',
      ],
      exclude: ['**/*.d.ts', '**/*.test.*', '**/types.ts', 'test/**'],
    },
  },
})
