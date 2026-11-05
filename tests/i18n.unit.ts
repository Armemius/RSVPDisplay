import { createInstance } from 'i18next'
import { describe, expect, it } from 'vitest'
import en from '../src/locales/en.json'
import ru from '../src/locales/ru.json'

async function translator(lng: string) {
  const instance = createInstance()
  await instance.init({
    lng, resources: { en: { translation: en }, ru: { translation: ru } },
    fallbackLng: 'en', supportedLngs: ['en', 'ru'], interpolation: { escapeValue: false },
  })
  return instance
}

function entries(value: object, prefix = ''): [string, string][] {
  return Object.entries(value).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key
    return typeof child === 'string' ? [[path, child]] : entries(child, path)
  })
}

describe('translations', () => {
  it('covers the same keys and interpolation variables in both languages', () => {
    const english = Object.fromEntries(entries(en))
    const russian = Object.fromEntries(entries(ru))
    // Russian adds few/many forms; all other keys must match exactly.
    expect(Object.keys(russian).filter(key => !/_(few|many)$/.test(key)).sort()).toEqual(Object.keys(english).sort())
    for (const [key, text] of Object.entries(russian)) {
      const reference = english[key.replace(/_(few|many)$/, '_other')]
      const variables = (value: string) => [...value.matchAll(/{{\s*(\w+)/g)].map(match => match[1]).sort()
      expect(variables(text), key).toEqual(variables(reference))
      const tags = (value: string) => [...value.matchAll(/<\/?(\w+)\s*\/?>/g)].map(match => match[0]).sort()
      expect(tags(text), key).toEqual(tags(reference))
    }
  })

  it('uses English singular and plural forms', async () => {
    const i18n = await translator('en')
    expect(i18n.t('document.words', { count: 1 })).toBe('1 word')
    expect(i18n.t('document.words', { count: 2 })).toBe('2 words')
  })

  it.each([
    [1, '1 слово'], [2, '2 слова'], [5, '5 слов'],
    [11, '11 слов'], [21, '21 слово'], [22, '22 слова'],
  ])('uses Russian plural rules for %i', async (count, words) => {
    const i18n = await translator('ru')
    expect(i18n.t('document.words', { count })).toBe(words)
  })

  it('formats file sizes and error locations in the active locale', async () => {
    const i18n = await translator('ru')
    expect(i18n.t('import.fileSize', { size: 1.5 })).toBe('До 1,5 МБ')
    expect(i18n.t('errors.atLine', { line: 4, message: i18n.t('errors.chapter') })).toBe('Строка 4: Укажите название после @chapter.')
  })

  it('falls back to English for an unsupported language', async () => {
    const i18n = await translator('de')
    expect(i18n.resolvedLanguage).toBe('en')
    expect(i18n.t('import.choose')).toBe('Choose a file')
  })
})
