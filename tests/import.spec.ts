import { expect, test } from '@playwright/test'

const raw = '@rsvp 1\n@title My test read\n@source test.txt\n@author A Reader\n@chapter First\nHello world.\n@chapter Second\n@@Escaped text.\n'

test.beforeEach(async ({ page }) => { await page.goto('/') })

test('imports a file, changes chapter and source views, and removes it', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.getByLabel('Choose an RSVP file').setInputFiles({ name: 'test.rsvp', mimeType: 'text/plain', buffer: Buffer.from(raw) })
  await expect(page.getByRole('heading', { name: 'My test read' })).toBeVisible()
  await expect(page.getByText('by A Reader')).toBeVisible()
  await expect(page.getByRole('article')).toContainText('Hello world.')
  await page.getByRole('button', { name: '2. Second' }).click()
  await expect(page.getByRole('article')).toContainText('@Escaped text.')
  await page.getByRole('tab', { name: 'File source' }).click()
  await expect(page.locator('.raw-preview')).toHaveText(raw)
  await page.getByRole('button', { name: 'Remove document' }).click()
  await expect(page.getByRole('button', { name: 'Choose a file' })).toBeVisible()
  expect(errors).toEqual([])
})

test('reports invalid input, recovers, and retains a loaded file on failed replacement', async ({ page }) => {
  const input = page.getByLabel('Choose an RSVP file')
  await input.setInputFiles({ name: 'bad.rsvp', mimeType: 'text/plain', buffer: Buffer.from('invalid') })
  await expect(page.getByRole('alert')).toContainText('must start with @rsvp 1')
  await input.setInputFiles({ name: 'good.rsvp', mimeType: 'text/plain', buffer: Buffer.from(raw) })
  await expect(page.getByRole('alert')).toHaveCount(0)
  await input.setInputFiles({ name: 'wrong.pdf', mimeType: 'application/pdf', buffer: Buffer.from('wrong') })
  await expect(page.getByRole('alert')).toContainText('Choose a .rsvp file')
  await expect(page.getByRole('heading', { name: 'My test read' })).toBeVisible()
})

test('loads an example, downloads a template, and opens accessible help', async ({ page }) => {
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('link', { name: 'Download template' }).click()
  expect((await downloadPromise).suggestedFilename()).toBe('example.rsvp')
  await page.getByRole('button', { name: 'Try an example' }).click()
  await expect(page.getByRole('heading', { name: 'The Art of Paying Attention' })).toBeVisible()
  await page.getByRole('button', { name: 'How it works' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('accepts a dropped file and rejects multiple dropped files', async ({ page }) => {
  async function drop(contents: string[]) {
    const transfer = await page.evaluateHandle((texts) => {
      const data = new DataTransfer()
      texts.forEach((text, index) => data.items.add(new File([text], `file-${index}.rsvp`, { type: 'text/plain' })))
      return data
    }, contents)
    await page.locator('.drop-zone').dispatchEvent('drop', { dataTransfer: transfer })
  }
  await drop([raw, raw])
  await expect(page.getByRole('alert')).toContainText('one .rsvp file at a time')
  await drop([raw])
  await expect(page.getByRole('heading', { name: 'My test read' })).toBeVisible()
})

test('fits the viewport before and after import', async ({ page }, testInfo) => {
  await expect(page.getByRole('heading', { name: /A little less noise/ })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: testInfo.outputPath('import-page.png'), fullPage: true })
  await page.getByRole('button', { name: 'Try an example' }).click()
  await expect(page.getByRole('heading', { name: 'The Art of Paying Attention' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: testInfo.outputPath('document-preview.png'), fullPage: true })
})
