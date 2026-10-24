import { BookOpen } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import Button from '../ui/Button'

export default function TeacherEmptyState({ title, description, actionLabel, onAction, icon: Icon = BookOpen }) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
      <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-muted">
        <Icon size={44} className="text-muted-foreground" aria-hidden="true" />
      </div>
      <h2 className="text-2xl font-black text-foreground">{title ?? t('teacher.empty.title')}</h2>
      {(description ?? t('teacher.empty.description')) && (
        <p className="mt-2 max-w-md text-muted-foreground">{description ?? t('teacher.empty.description')}</p>
      )}
      {onAction && (
        <Button variant="primary" size="lg" onClick={onAction} className="mt-6">
          {actionLabel ?? t('teacher.empty.createFirst')}
        </Button>
      )}
    </div>
  )
}
