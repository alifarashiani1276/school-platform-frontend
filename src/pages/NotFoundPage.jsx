import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import PublicHeader from '../components/PublicHeader'

export default function NotFoundPage() {
  const { t } = useTranslation()

  return (
    <>
      <PublicHeader />
      <main className="px-4 py-20 text-center">
        <h1 className="text-3xl font-black">{t('notFound.title')}</h1>
        <p className="mt-2 text-muted-foreground">{t('notFound.text')}</p>
        <Link to="/" className="mt-6 inline-block rounded-full bg-primary px-6 py-3 font-black text-primary-foreground">
          {t('notFound.back')}
        </Link>
      </main>
    </>
  )
}
