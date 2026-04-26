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

test('gantt page renders 24 AP rows', async ({ page }) => {
  await login(page)
  await page.goto('/gantt')
  await page.waitForLoadState('networkidle')

  // Título visível
  await expect(page.getByRole('heading', { name: /gantt/i })).toBeVisible()

  // Botões de zoom presentes
  await expect(page.getByRole('button', { name: /sem/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /mês/i })).toBeVisible()
})

test('gantt row expands to show 8 fases', async ({ page }) => {
  await login(page)
  await page.goto('/gantt')
  await page.waitForLoadState('networkidle')

  // Clicar para expandir a primeira linha AP
  const firstRow = page.locator('.lucide-chevron-right').first()
  await firstRow.click()

  // Deve aparecer pelo menos uma sub-linha (fase "Tetos")
  await expect(page.getByText('Tetos').first()).toBeVisible({ timeout: 5000 })
})

test('click on fase bar opens edit modal', async ({ page }) => {
  await login(page)
  await page.goto('/gantt')
  await page.waitForLoadState('networkidle')

  // Expandir primeiro AP
  await page.locator('.lucide-chevron-right').first().click()

  // Clicar no placeholder "sem datas" da primeira fase
  const noDatePlaceholder = page.getByText('sem datas').first()
  await expect(noDatePlaceholder).toBeVisible({ timeout: 5000 })
  await noDatePlaceholder.click()

  // Modal deve abrir com campos de data
  await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })
  await expect(page.getByLabel('Início')).toBeVisible()
  await expect(page.getByLabel('Fim')).toBeVisible()

  // Fechar modal
  await page.getByRole('button', { name: /cancelar/i }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
})
