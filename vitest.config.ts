import { resolve } from 'path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      $: resolve(__dirname, 'src'),
      'server-only': resolve(__dirname, '__tests__/server-only-stub.ts'),
    },
  },
  test: {
    include: ['__tests__/**/*.test.ts'],
    exclude: ['__tests__/e2e/**'],
    reporters: ['tree'],
    env: {
      LOG_DIR: './data/log',
      UPLOAD_TMP_DIR: '/var/tmp',
    },
  },
})
