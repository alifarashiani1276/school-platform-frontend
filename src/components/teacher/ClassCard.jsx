import { Archive, ArchiveRestore, BookOpen, ExternalLink, MoreHorizontal, Pencil, School, Users } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { getStudentCount } from '../../data/teacherStore'
import Button from '../ui/Button'
import DropdownMenu, { DropdownMenuItem } from '../ui/DropdownMenu'

export default function ClassCard({ classData, onEdit, onArchive, onRestore }) {
  const { t } = useTranslation()
  const archived = Boolean(classData.archived)
  const subtitle = [
    classData.grade && t('teacher.class.gradeValue', { value: classData.grade }),
    classData.subject,
    classData.schoolYear,
  ]
    .filter(Boolean)
    .join(' • ')

  return (
    <article
      className={`group flex min-w-0 flex-col rounded-2xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md ${
        archived ? 'opacity-90' : ''
      }`}
    >
      <div className="mb-4 flex justify-center">
        <div
          className={`relative flex h-20 w-20 items-center justify-center rounded-full text-4xl ${classData.color || 'bg-purple-100'} ${
            archived ? 'grayscale' : ''
          }`}
          aria-hidden="true"
        >
          {classData.emoji || '📚'}
        </div>
      </div>

      <div className="mb-4 flex-1 text-center">
        <h3 className="break-words text-lg font-black text-foreground" dir="auto">
          {classData.name}
        </h3>
        {(classData.isExample || archived) && (
          <span className="mt-1 inline-block rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-accent-foreground">
            {archived ? t('teacher.class.archivedBadge') : t('teacher.class.exampleBadge')}
          </span>
        )}
        {classData.schoolName ? (
          <p
            className="mt-2 flex items-center justify-center gap-1.5 break-words text-sm font-bold text-primary"
            dir="auto"
          >
            <School size={15} className="shrink-0" aria-hidden="true" />
            <span className="min-w-0">{classData.schoolName}</span>
          </p>
        ) : (
          !archived && (
            <button
              type="button"
              onClick={() => onEdit(classData)}
              className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-dashed border-border px-3 py-1 text-xs font-bold text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            >
              <School size={13} aria-hidden="true" />
              {t('teacher.class.addSchoolName')}
            </button>
          )
        )}
        {subtitle && (
          <p className="mt-1 break-words text-sm text-muted-foreground" dir="auto">
            {subtitle}
          </p>
        )}
        <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm font-bold text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Users size={16} aria-hidden="true" />
            {t('teacher.class.lessonStudents', { count: getStudentCount(classData) })}
          </span>
          <span className="inline-flex items-center gap-1">
            <BookOpen size={16} aria-hidden="true" />
            {t('teacher.class.lessonsCount', { count: classData.lessons?.length ?? 0 })}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        {archived ? (
          <Button variant="primary" className="w-full" onClick={() => onRestore(classData.id)}>
            <ArchiveRestore size={16} aria-hidden="true" />
            {t('teacher.class.restore')}
          </Button>
        ) : (
          <Link
            to={`/teacher/class/${classData.id}`}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 font-bold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <ExternalLink size={16} aria-hidden="true" />
            {t('teacher.class.openClass')}
          </Link>
        )}

        <div className="flex gap-2">
          <Link
            to={`/teacher/class/${classData.id}#students`}
            className="inline-flex min-h-[40px] flex-1 items-center justify-center gap-2 rounded-xl border-2 border-border px-3 py-1.5 text-sm font-bold transition-colors hover:bg-muted"
          >
            <Users size={14} aria-hidden="true" />
            <span className="truncate">{t('teacher.class.manage')}</span>
          </Link>

          <DropdownMenu
            label={t('teacher.class.moreActions')}
            trigger={
              <button
                type="button"
                aria-label={t('teacher.class.moreActions')}
                className="grid h-10 w-10 place-items-center rounded-xl border-2 border-border transition-colors hover:bg-muted"
              >
                <MoreHorizontal size={18} aria-hidden="true" />
              </button>
            }
          >
            <DropdownMenuItem icon={Pencil} onClick={() => onEdit(classData)}>
              {t('teacher.class.edit')}
            </DropdownMenuItem>
            {archived ? (
              <DropdownMenuItem icon={ArchiveRestore} onClick={() => onRestore(classData.id)}>
                {t('teacher.class.restore')}
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem icon={Archive} onClick={() => onArchive(classData.id)}>
                {t('teacher.class.archive')}
              </DropdownMenuItem>
            )}
          </DropdownMenu>
        </div>
      </div>
    </article>
  )
}
