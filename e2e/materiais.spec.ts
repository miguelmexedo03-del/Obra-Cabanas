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

test('a página de materiais carrega e mostra a tabela', async ({ page }) => {
  await login(page)
  await page.goto('/materiais')
  await expect(page.getByRole('heading', { name: 'Materiais' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'Categoria' })).toBeVisible()
})
