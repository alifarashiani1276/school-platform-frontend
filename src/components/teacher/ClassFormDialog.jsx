import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import Dialog from '../ui/Dialog'
import Input from '../ui/Input'
import Button from '../ui/Button'

export const CLASS_EMOJIS = ['🌟', '🎨', '🔢', '🔬', '📚', '🎵', '⚽', '🌈', '🚀', '💡', '🎯', '🏆']
export const CLASS_COLORS = [
  'bg-purple-100',
  'bg-blue-100',
  'bg-green-100',
  'bg-yellow-100',
  'bg-pink-100',
  'bg-red-100',
  'bg-indigo-100',
  'bg-cyan-100',
]

const emptyForm = () => ({
  name: '',
  schoolName: '',
  grade: '',
  subject: '',
  schoolYear: '',
  description: '',
  emoji: CLASS_EMOJIS[0],
  color: CLASS_COLORS[0],
})

// Shared create/edit form. Mount it fresh per use (key it) so state starts clean.
function ClassForm({ initial, existingNames, submitLabel, onCancel, onSubmit }) {
  const { t } = useTranslation()
  const [form, setForm] = useState({ ...emptyForm(), ...initial })
  const [errors, setErrors] = useState({})

  const change = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => (prev[field] ? { ...prev, [field]: '' } : prev))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    const name = form.name.trim()
    const next = {}
    if (!name) next.name = t('teacher.dialog.errors.nameRequired')
    else if (name.length > 60) next.name = t('teacher.dialog.errors.nameTooLong')
    else if (existingNames.some((n) => n.trim().toLowerCase() === name.toLowerCase())) {
      next.name = t('teacher.dialog.errors.nameDuplicate')
    }
    if (Object.keys(next).length) {
      setErrors(next)
      return
    }
    onSubmit({
      ...form,
      name,
      schoolName: form.schoolName.trim(),
      grade: form.grade.trim(),
      subject: form.subject.trim(),
      schoolYear: form.schoolYear.trim(),
      description: form.description.trim(),
    })
  }

  const optional = ` (${t('common.optional')})`

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <Input
        label={`${t('teacher.dialog.className')} *`}
        value={form.name}
        onChange={(e) => change('name', e.target.value)}
        error={errors.name}
        placeholder={t('teacher.dialog.classNamePlaceholder')}
        autoFocus
        aria-required="true"
        dir="auto"
      />

      <Input
        label={t('teacher.dialog.schoolName') + optional}
        value={form.schoolName}
        onChange={(e) => change('schoolName', e.target.value)}
        placeholder={t('teacher.dialog.schoolNamePlaceholder')}
        maxLength={80}
        dir="auto"
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label={t('teacher.dialog.gradeOrAge') + optional}
          value={form.grade}
          onChange={(e) => change('grade', e.target.value)}
          placeholder="1"
          dir="auto"
        />
        <Input
          label={t('teacher.dialog.subject') + optional}
          value={form.subject}
          onChange={(e) => change('subject', e.target.value)}
          placeholder={t('teacher.dialog.subjectPlaceholder')}
          dir="auto"
        />
      </div>

      <Input
        label={t('teacher.dialog.schoolYear') + optional}
        value={form.schoolYear}
        onChange={(e) => change('schoolYear', e.target.value)}
        placeholder={t('teacher.dialog.schoolYearPlaceholder')}
        dir="auto"
      />

      <div>
        <label htmlFor="class-description" className="mb-1.5 block text-sm font-bold text-foreground">
          {t('teacher.dialog.description') + optional}
        </label>
        <textarea
          id="class-description"
          rows={3}
          value={form.description}
          onChange={(e) => change('description', e.target.value)}
          placeholder={t('teacher.dialog.descriptionPlaceholder')}
          dir="auto"
          className="w-full resize-none rounded-xl border-2 border-border bg-card px-4 py-2.5 text-foreground transition-colors placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <div>
        <p className="mb-1.5 text-sm font-bold text-foreground">{t('teacher.dialog.emoji')}</p>
        <div className="flex flex-wrap gap-2">
          {CLASS_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              aria-pressed={form.emoji === emoji}
              onClick={() => change('emoji', emoji)}
              className={`flex h-11 w-11 items-center justify-center rounded-xl border-2 text-2xl transition-colors ${
                form.emoji === emoji ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'
              }`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-sm font-bold text-foreground">{t('teacher.dialog.color')}</p>
        <div className="flex flex-wrap gap-2">
          {CLASS_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              aria-pressed={form.color === color}
              aria-label={color.replace('bg-', '').replace('-100', '')}
              onClick={() => change('color', color)}
              className={`h-11 w-11 rounded-xl border-2 transition-colors ${color} ${
                form.color === color ? 'border-primary ring-2 ring-primary/30' : 'border-border hover:border-primary/50'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          {t('common.cancel')}
        </Button>
        <Button type="submit" variant="primary" className="flex-1">
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}

export default function ClassFormDialog({ open, title, onClose, ...formProps }) {
  return (
    <Dialog open={open} onClose={onClose} title={title}>
      <ClassForm {...formProps} onCancel={onClose} />
    </Dialog>
  )
}
