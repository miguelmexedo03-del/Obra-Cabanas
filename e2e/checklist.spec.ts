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

  // Find the first unchecked checkbox label
  const firstUnchecked = page.locator('label').filter({
    has: page.locator('input[type="checkbox"]:not(:checked)'),
  }).first()

  await expect(firstUnchecked).toBeVisible()
  const elementoText = await firstUnchecked.locator('p').first().textContent()

  // Check it
  await firstUnchecked.click()

  // Optimistic update: checked state visible immediately
  const checkbox = firstUnchecked.locator('input[type="checkbox"]')
  await expect(checkbox).toBeChecked()

  // Reload and verify persistence
  await page.reload()
  const reloadedItem = page.locator('label').filter({
    has: page.locator(`p:text-is("${elementoText}")`),
  }).first()
  const reloadedCheckbox = reloadedItem.locator('input[type="checkbox"]')
  await expect(reloadedCheckbox).toBeChecked()

  // Uncheck it (cleanup so test is re-runnable)
  await reloadedItem.click()
  await expect(reloadedCheckbox).not.toBeChecked()
  await page.reload()
  const cleanupCheckbox = page.locator('label').filter({
    has: page.locator(`p:text-is("${elementoText}")`),
  }).first().locator('input[type="checkbox"]')
  await expect(cleanupCheckbox).not.toBeChecked()
})
