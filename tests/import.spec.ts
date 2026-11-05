import { expect, test } from '@playwright/test'

const raw = '@rsvp 1\n@title My test read\n@source test.txt\n@author A Reader\n@chapter First\nHello world.\n@chapter Second\n@@Escaped text.\n'

test.beforeEach(async ({ page }) => { await page.goto('/') })

test('opens the file picker, displays chapters, and removes the document', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Choose a file' }).click()
  await (await chooser).setFiles({ name: 'test.rsvp', mimeType: 'text/plain', buffer: Buffer.from(raw) })
  await expect(page.getByRole('heading', { name: 'My test read' })).toBeVisible()
  await expect(page.getByText('by A Reader')).toBeVisible()
  await expect(page.getByRole('article')).toContainText('Hello world.')
  await page.getByRole('combobox', { name: 'Chapters' }).selectOption('1')
  await expect(page.getByRole('article')).toContainText('@Escaped text.')
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
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Replace file' }).click()
  await (await chooser).setFiles({ name: 'wrong.pdf', mimeType: 'application/pdf', buffer: Buffer.from('wrong') })
  await expect(page.getByRole('alert')).toContainText('Choose a .rsvp file')
  await expect(page.getByRole('heading', { name: 'My test read' })).toBeVisible()
})

test('accepts dropped files in both empty and viewer states and rejects multiple files', async ({ page }) => {
  async function drop(contents: string[]) {
    const transfer = await page.evaluateHandle((texts) => {
      const data = new DataTransfer()
      texts.forEach((text, index) => data.items.add(new File([text], `file-${index}.rsvp`, { type: 'text/plain' })))
      return data
    }, contents)
    await page.getByRole('main').dispatchEvent('drop', { dataTransfer: transfer })
  }
  await drop([raw, raw])
  await expect(page.getByRole('alert')).toContainText('one .rsvp file at a time')
  await drop([raw])
  await expect(page.getByRole('heading', { name: 'My test read' })).toBeVisible()
  await drop([raw.replace('My test read', 'Replacement read')])
  await expect(page.getByRole('heading', { name: 'Replacement read' })).toBeVisible()
})

test('fits the viewport before and after import', async ({ page }, testInfo) => {
  await expect(page.getByRole('heading', { name: 'Drop a .rsvp file' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: testInfo.outputPath('import-page.png'), fullPage: true })
  await page.getByLabel('Choose an RSVP file').setInputFiles('public/example.rsvp')
  await expect(page.getByRole('heading', { name: 'The Art of Paying Attention' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: testInfo.outputPath('document-preview.png'), fullPage: true })
})
