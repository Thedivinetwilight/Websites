import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: false,
    include: ['tests/**/*.test.{ts,tsx}'],
    // API suites run in Node; UI suites opt into jsdom with a docblock.
    environment: 'node',
    setupFiles: ['tests/setup.ts'],
    testTimeout: 20_000,
    hookTimeout: 20_000,
    restoreMocks: true,
    reporters: ['default'],
  },
})
