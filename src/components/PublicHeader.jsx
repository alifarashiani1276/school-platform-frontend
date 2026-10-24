import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import LanguageSwitcher from './LanguageSwitcher'
import ThemeSwitcher from './ThemeSwitcher'

export default function PublicHeader() {
  const { t } = useTranslation()

  return (
    <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-8">
      <Link to="/" className="flex items-center gap-2 text-xl font-black text-primary">
        <img src="/images/logo.webp" alt="Logo" className="h-10 w-10 object-contain" />
        {t('brand')}
      </Link>
      <div className="flex items-center gap-2">
        <LanguageSwitcher />
        <ThemeSwitcher />
      </div>
    </header>
  )
}
