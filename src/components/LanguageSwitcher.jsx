import { Check, ChevronDown, Globe } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LANGUAGES } from '../i18n'

export default function LanguageSwitcher() {
  const { t, i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false)
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  const currentLanguage = LANGUAGES.find((lang) => lang.code === i18n.language)

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-sm font-bold"
      >
        <Globe size={16} aria-hidden="true" />
        <span>{currentLanguage?.label || 'English'}</span>
        <ChevronDown size={14} aria-hidden="true" className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute end-0 top-12 z-20 min-w-[140px] space-y-1 rounded-xl border border-border bg-card p-2 shadow-xl">
          {LANGUAGES.map(({ code, label }) => {
            const selected = code === i18n.language
            return (
              <button
                key={code}
                type="button"
                onClick={() => {
                  i18n.changeLanguage(code)
                  setOpen(false)
                }}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-start text-sm font-bold transition ${
                  selected ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                }`}
              >
                <span className="flex-1">{label}</span>
                {selected && <Check size={16} aria-hidden="true" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
