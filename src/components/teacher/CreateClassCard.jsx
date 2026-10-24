import { Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function CreateClassCard({ onClick }) {
  const { t } = useTranslation()

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex min-h-[260px] min-w-0 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-card p-5 transition-all hover:border-primary hover:shadow-md"
    >
      <span className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition-transform group-hover:scale-105">
        <Plus size={40} strokeWidth={3} aria-hidden="true" />
      </span>
      <span className="break-words text-lg font-black text-foreground">{t('teacher.class.newClass')}</span>
    </button>
  )
}
