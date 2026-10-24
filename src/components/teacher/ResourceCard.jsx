import { ArrowUpRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function ResourceCard({ resource, onOpen }) {
  const { t } = useTranslation()

  return (
    <button
      type="button"
      onClick={() => onOpen(resource)}
      className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-card text-start shadow-sm transition-all hover:shadow-lg"
    >
      <div className={`relative flex h-40 items-center justify-center overflow-hidden bg-gradient-to-br ${resource.color}`} aria-hidden="true">
        <span className="absolute -top-6 h-28 w-28 rounded-full bg-white/40 [inset-inline-start:-1.5rem]" />
        <span className="absolute -bottom-8 h-32 w-32 rounded-full bg-white/30 [inset-inline-end:-1rem]" />
        <span className="relative text-6xl drop-shadow-sm transition-transform group-hover:scale-110">{resource.emoji}</span>
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="break-words text-lg font-black text-foreground">
            {t(`teacher.resources.${resource.key}.title`)}
          </h3>
          <ArrowUpRight
            size={18}
            className="mt-1 shrink-0 text-muted-foreground transition-colors group-hover:text-primary rtl:-scale-x-100"
            aria-hidden="true"
          />
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{t(`teacher.resources.${resource.key}.description`)}</p>
      </div>
    </button>
  )
}
