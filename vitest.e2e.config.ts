import { resolve } from 'path'
import { loadEnvConfig } from '@next/env'
import { defineConfig } from 'vitest/config'

loadEnvConfig(process.cwd())

export default defineConfig({
  resolve: {
    alias: {
      $: resolve(__dirname, 'src'),
      'server-only': resolve(__dirname, '__tests__/server-only-stub.ts'),
    },
  },
  test: {
    include: ['__tests__/e2e/**/*.test.ts'],
    testTimeout: 30_000,
    reporters: ['tree'],
  },
})
