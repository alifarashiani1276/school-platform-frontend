import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import PublicHeader from '../components/PublicHeader'

// Temporary stand-in for the three dashboards, built in the next phase.
export default function PlaceholderDashboard({ role }) {
  const { t } = useTranslation()

  return (
    <>
      <PublicHeader />
      <main className="mx-auto max-w-3xl px-4 py-14">
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-bold transition hover:border-primary hover:text-primary"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          {t('common.back_to_home')}
        </Link>
        <h1 className="mt-6 text-3xl font-black">{t(`roles.${role}.title`)}</h1>
        <p className="mt-2 text-muted-foreground">{t(`roles.${role}.text`)}</p>
        <p className="mt-6 inline-block rounded-full bg-accent px-4 py-1 text-sm font-bold text-accent-foreground">
          {t('common.prototype')}
        </p>
      </main>
    </>
  )
}
