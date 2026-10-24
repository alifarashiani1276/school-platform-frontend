import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import fa from './locales/fa.json'
import en from './locales/en.json'
import ar from './locales/ar.json'
import ru from './locales/ru.json'
import de from './locales/de.json'
import fr from './locales/fr.json'

export const LANGUAGES = [
  { code: 'fa', label: 'فارسی', dir: 'rtl' },
  { code: 'en', label: 'English', dir: 'ltr' },
  { code: 'ar', label: 'العربية', dir: 'rtl' },
  { code: 'ru', label: 'Русский', dir: 'ltr' },
  { code: 'de', label: 'Deutsch', dir: 'ltr' },
  { code: 'fr', label: 'Français', dir: 'ltr' },
]

const STORAGE_KEY = 'school-lang'
const known = (code) => LANGUAGES.some((l) => l.code === code)
const saved = localStorage.getItem(STORAGE_KEY)

// Keep <html lang dir> and localStorage in sync with the active language.
export const applyLanguage = (code) => {
  const { dir } = LANGUAGES.find((l) => l.code === code)
  document.documentElement.lang = code
  document.documentElement.dir = dir
  localStorage.setItem(STORAGE_KEY, code)
}

i18n.use(initReactI18next).init({
  resources: Object.fromEntries(
    Object.entries({ fa, en, ar, ru, de, fr }).map(([code, translation]) => [code, { translation }])
  ),
  lng: known(saved) ? saved : 'fa',
  fallbackLng: false,
  interpolation: { escapeValue: false },
})

applyLanguage(i18n.language)
i18n.on('languageChanged', applyLanguage)

export default i18n
