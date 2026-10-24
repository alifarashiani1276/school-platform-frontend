import { useTranslation } from 'react-i18next'
import ClassFormDialog from './ClassFormDialog'

export default function CreateClassDialog({ open, onClose, onSubmit, existingNames = [] }) {
  const { t } = useTranslation()
  return (
    <ClassFormDialog
      open={open}
      title={t('teacher.dialog.createClass')}
      submitLabel={t('teacher.dialog.create')}
      existingNames={existingNames}
      onClose={onClose}
      onSubmit={onSubmit}
    />
  )
}
