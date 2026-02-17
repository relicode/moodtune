import { readFileSync } from 'fs'
import { resolve } from 'path'
import { defineConfig } from 'vitest/config'

// Parse .env.local and inject into process.env before tests run
const envPath = resolve(__dirname, '.env.local')
const envContent = readFileSync(envPath, 'utf-8')
for (const line of envContent.split('\n')) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) continue
  const eqIndex = trimmed.indexOf('=')
  if (eqIndex === -1) continue
  const key = trimmed.slice(0, eqIndex)
  const value = trimmed.slice(eqIndex + 1)
  if (!process.env[key]) process.env[key] = value
}

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
