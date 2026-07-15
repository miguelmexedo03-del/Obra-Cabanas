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

// Smoke. Corre em CI/preview (precisa da app a servir + sessão), NÃO localmente
// (ver constrangimento de RAM/localhost do projeto).
test('página do relatório executivo carrega e gera um parágrafo', async ({ page }) => {
  await login(page)
  await page.goto('/relatorio/executivo')
  await page.waitForLoadState('networkidle')

  await expect(page.getByRole('heading', { name: 'Relatório Executivo' })).toBeVisible()

  // exact: true evita colisão com o botão "Gerar obra toda" (substring match por defeito)
  await page.getByRole('button', { name: 'Gerar', exact: true }).click()

  // Aparece um parágrafo (LLM ou template) num tempo razoável
  await expect(page.locator('p.whitespace-pre-wrap')).toBeVisible({ timeout: 30_000 })
})
