import { useTranslation } from 'react-i18next'
import ClassFormDialog from './ClassFormDialog'

export default function EditClassDialog({ open, onClose, onSubmit, classData, existingNames = [] }) {
  const { t } = useTranslation()
  if (!classData) return null
  // Names of the *other* classes, so a class can keep its own name.
  const others = existingNames.filter((n) => n !== classData.name)
  return (
    <ClassFormDialog
      key={classData.id}
      open={open}
      title={t('teacher.dialog.editClass')}
      submitLabel={t('teacher.dialog.save')}
      initial={classData}
      existingNames={others}
      onClose={onClose}
      onSubmit={(values) => onSubmit({ ...classData, ...values })}
    />
  )
}
