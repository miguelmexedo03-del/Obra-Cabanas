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

test('botões de relatório aparecem na página do AP', async ({ page }) => {
  await login(page)
  await page.goto('/apartamentos/1')
  await page.waitForLoadState('networkidle')

  await expect(page.getByRole('link', { name: /ver relatório/i })).toBeVisible()
  await expect(page.getByRole('link', { name: /exportar pdf/i })).toBeVisible()
})

test('página /relatorio?ap=1 carrega com header correto', async ({ page }) => {
  await login(page)
  await page.goto('/relatorio?ap=1')
  await page.waitForLoadState('networkidle')

  // Verifica título do AP
  await expect(page.locator('h1')).toContainText('AP1')

  // Verifica que há pelo menos uma das secções (em falta ou com observação)
  const hasSections =
    (await page.locator('text=Em falta').count()) > 0 ||
    (await page.locator('text=Feito com observação').count()) > 0 ||
    (await page.locator('text=Nenhuma ocorrência').count()) > 0

  expect(hasSections).toBe(true)
})

test('lightbox abre e fecha com Escape', async ({ page }) => {
  await login(page)

  // Encontrar um AP que tenha fotos no relatório
  await page.goto('/relatorio?ap=3')
  await page.waitForLoadState('networkidle')

  const firstPhoto = page.locator('button img').first()
  const hasPhoto = await firstPhoto.count() > 0
  test.skip(!hasPhoto, 'AP3 has no photos in report — test requires at least one photo')

  await firstPhoto.click()
  // Lightbox overlay deve aparecer
  await expect(page.locator('.fixed.z-\\[300\\]')).toBeVisible()

  // Escape fecha
  await page.keyboard.press('Escape')
  await expect(page.locator('.fixed.z-\\[300\\]')).not.toBeVisible()
})
