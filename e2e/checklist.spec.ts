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

test('checklist toggle persists across reload', async ({ page }) => {
  await login(page)
  await page.goto('/apartamentos/1')
  await page.waitForLoadState('networkidle')

  const allCheckboxes = page.locator('input[type="checkbox"]')

  // Find first unchecked checkbox by scanning positions
  const count = await allCheckboxes.count()
  let targetIdx = -1
  for (let i = 0; i < count; i++) {
    if (!(await allCheckboxes.nth(i).isChecked())) {
      targetIdx = i
      break
    }
  }
  expect(targetIdx, 'Expected at least one unchecked item in AP1').toBeGreaterThanOrEqual(0)

  // Click the sr-only input directly (force bypasses clip/visibility)
  await allCheckboxes.nth(targetIdx).click({ force: true })

  // Optimistic update should be immediate
  await expect(allCheckboxes.nth(targetIdx)).toBeChecked({ timeout: 8000 })

  // Reload — verify the toggle was persisted to the DB
  await page.reload()
  await page.waitForLoadState('networkidle')
  await expect(page.locator('input[type="checkbox"]').nth(targetIdx)).toBeChecked()

  // Cleanup: uncheck so test is idempotent across runs
  await page.locator('input[type="checkbox"]').nth(targetIdx).click({ force: true })
  await page.reload()
  await page.waitForLoadState('networkidle')
  await expect(page.locator('input[type="checkbox"]').nth(targetIdx)).not.toBeChecked()
})
