import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'
import en from './locales/en.json'
import ru from './locales/ru.json'

export const resources = { en: { translation: en }, ru: { translation: ru } }
export const supportedLanguages = ['en', 'ru'] as const

// Bundled translations work offline; only the language preference is persisted.
void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    supportedLngs: [...supportedLanguages],
    fallbackLng: 'en',
    load: 'languageOnly',
    initAsync: false,
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'rsvp-display-language',
    },
    interpolation: { escapeValue: false }, // React escapes rendered text.
  })

export default i18n
