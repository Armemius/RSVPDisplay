import { expect, test } from '@playwright/test'

const raw = '@rsvp 1\n@title Original document\n@source original.txt\n@author Original Author\n@chapter First chapter\nFirst paragraph.\n@chapter Second chapter\nOriginal second paragraph.\n'

test('switches loaded documents without changing their content or current chapter', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Choose an RSVP file').setInputFiles({ name: 'original.rsvp', mimeType: 'text/plain', buffer: Buffer.from(raw) })
  await page.getByRole('combobox', { name: 'Chapters' }).selectOption('1')
  await page.getByRole('combobox', { name: 'Interface language' }).selectOption('ru')
  await expect(page.locator('html')).toHaveAttribute('lang', 'ru')
  await expect(page).toHaveTitle('RSVP Display')
  await expect(page.getByRole('combobox', { name: 'Главы' })).toHaveValue('1')
  await expect(page.getByText('Автор: Original Author')).toBeVisible()
  await expect(page.getByRole('article')).toContainText('Original second paragraph.')
  await expect(page.getByRole('article')).not.toContainText('First paragraph.')
  await page.getByRole('combobox', { name: 'Язык интерфейса' }).selectOption('en')
  await expect(page.getByRole('article')).toContainText('Original second paragraph.')
})

test('retranslates visible parser errors when switching language', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Choose an RSVP file').setInputFiles({
    name: 'invalid.rsvp', mimeType: 'text/plain', buffer: Buffer.from('@rsvp 1\n@title A\n@source B\n@chapter\nHello'),
  })
  await expect(page.getByRole('alert')).toContainText('Line 4: @chapter needs a title.')
  await page.getByRole('combobox', { name: /Interface language|Язык интерфейса/ }).selectOption('ru')
  await expect(page.getByRole('alert')).toContainText('Строка 4: Укажите название после @chapter.')
  await page.getByRole('combobox', { name: /Interface language|Язык интерфейса/ }).selectOption('en')
  await expect(page.getByRole('alert')).toContainText('Line 4: @chapter needs a title.')
})

test.describe('Russian browser preference', () => {
  test.use({ locale: 'ru-RU' })

  test('detects Russian, remembers an override, and fits both layouts', async ({ page }, testInfo) => {
    await page.goto('/')
    await expect(page.locator('html')).toHaveAttribute('lang', 'ru')
    await expect(page.getByRole('button', { name: 'Выбрать файл', exact: true })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: testInfo.outputPath('russian-import.png'), fullPage: true })
    await page.getByLabel('Выбрать файл RSVP').setInputFiles('public/example.rsvp')
    await expect(page.getByRole('heading', { name: 'The Art of Paying Attention' })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: testInfo.outputPath('russian-preview.png'), fullPage: true })
    await page.getByRole('combobox', { name: /Interface language|Язык интерфейса/ }).selectOption('en')
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await expect(page.getByRole('button', { name: 'Choose a file' })).toBeVisible()
    expect(await page.evaluate(() => localStorage.getItem('rsvp-display-language'))).toBe('en')
  })

  test('works when localStorage is unavailable', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Blocked', 'SecurityError') } })
    })
    await page.goto('/')
    await expect(page.getByRole('button', { name: 'Выбрать файл', exact: true })).toBeVisible()
    await page.getByRole('combobox', { name: /Interface language|Язык интерфейса/ }).selectOption('en')
    await expect(page.getByRole('button', { name: 'Choose a file' })).toBeVisible()
  })
})

test.describe('Unsupported browser language', () => {
  test.use({ locale: 'de-DE' })
  test('falls back to English', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await expect(page.getByRole('button', { name: 'Choose a file' })).toBeVisible()
  })
})
