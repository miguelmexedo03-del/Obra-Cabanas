import { test, expect } from '@playwright/test'

const EMAIL = process.env.TEST_USER_EMAIL ?? ''
const PASSWORD = process.env.TEST_USER_PASSWORD ?? ''

test.skip(!EMAIL || !PASSWORD, 'Set TEST_USER_EMAIL and TEST_USER_PASSWORD in .env.test.local')

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(EMAIL)
  await page.getByLabel('Password').fill(PASSWORD)
  await page.getByRole('button', { name: /entrar/i }).click()
  await page.waitForURL('/')
}

test('dashboard shows KPI cards', async ({ page }) => {
  await login(page)
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible()
  await expect(page.getByText('Progresso total')).toBeVisible()
  await expect(page.getByText('Bottleneck')).toBeVisible()
})

test('dashboard shows 24 AP cards', async ({ page }) => {
  await login(page)
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  const apLinks = page.getByRole('link', { name: /^AP\d+$/ })
  await expect(apLinks).toHaveCount(24)
})

test('lob page renders and takt form is present', async ({ page }) => {
  await login(page)
  await page.goto('/lob')
  await page.waitForLoadState('networkidle')

  await expect(page.getByRole('heading', { name: /line of balance/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /calcular lob/i })).toBeVisible()
})

test('lob takt form calculates and shows chart', async ({ page }) => {
  await login(page)
  await page.goto('/lob')
  await page.waitForLoadState('networkidle')

  await page.getByRole('button', { name: /calcular lob/i }).click()

  await expect(page.locator('svg[aria-label="Line of Balance"]')).toBeVisible({ timeout: 5000 })
})
