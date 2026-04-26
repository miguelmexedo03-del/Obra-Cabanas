import { defineConfig, devices } from '@playwright/test'
import path from 'path'

const envPath = path.resolve(__dirname, '.env.test.local')
// Load test credentials from .env.test.local if it exists
try {
  require('fs').readFileSync(envPath, 'utf-8').split('\n').forEach((line: string) => {
    const [key, ...rest] = line.split('=')
    if (key?.trim() && !process.env[key.trim()]) {
      process.env[key.trim()] = rest.join('=').trim()
    }
  })
} catch { /* file doesn't exist yet — tests will skip */ }

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: 1,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 60_000,
  },
})
