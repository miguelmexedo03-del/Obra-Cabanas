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

test('kanban page renders 4 columns', async ({ page }) => {
  await login(page)
  await page.goto('/kanban')
  await page.waitForLoadState('networkidle')

  await expect(page.getByRole('heading', { name: /kanban/i })).toBeVisible()
  await expect(page.getByText('Por Fazer')).toBeVisible()
  await expect(page.getByText('Em Curso')).toBeVisible()
  await expect(page.getByText('Bloqueado')).toBeVisible()
  await expect(page.getByText('Concluído')).toBeVisible()
})

test('kanban nav link is present', async ({ page }) => {
  await login(page)
  await expect(page.getByRole('link', { name: /kanban/i })).toBeVisible()
})

test('kanban shows cards with AP codes', async ({ page }) => {
  await login(page)
  await page.goto('/kanban')
  await page.waitForLoadState('networkidle')

  // Deve haver pelo menos um card com código AP (AP1..AP24)
  const firstApCard = page.getByText(/^AP\d+$/).first()
  await expect(firstApCard).toBeVisible({ timeout: 5000 })
})
