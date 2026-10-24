import { Check, Moon, Palette, Sun } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PALETTES, PALETTE_IDS } from '../themes/palettes'
import { useTheme } from '../themes/ThemeProvider'

function ModeButton({ active, icon: Icon, label, onClick }) {
  const style = active ? 'bg-primary text-primary-foreground' : 'bg-card text-foreground'
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-2 rounded-xl border border-border py-2 text-sm font-bold ${style}`}
    >
      <Icon size={16} aria-hidden="true" />
      {label}
    </button>
  )
}

export default function ThemeSwitcher() {
  const { t } = useTranslation()
  const { palette, setPalette, mode, setMode } = useTheme()
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

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        aria-expanded={open}
        aria-label={t('settings.palette')}
        onClick={() => setOpen(!open)}
        className="grid h-10 w-10 place-items-center rounded-full border border-border bg-card"
      >
        <Palette size={18} aria-hidden="true" />
      </button>

      {open && (
        <div className="absolute end-0 top-12 z-20 w-72 space-y-4 rounded-2xl border border-border bg-card p-4 shadow-xl">
          <div>
            <p className="mb-2 text-sm font-black">{t('settings.appearance')}</p>
            <div className="flex gap-2">
              <ModeButton active={mode === 'light'} icon={Sun} label={t('settings.light')} onClick={() => setMode('light')} />
              <ModeButton active={mode === 'dark'} icon={Moon} label={t('settings.dark')} onClick={() => setMode('dark')} />
            </div>
          </div>

          <div role="radiogroup" aria-label={t('settings.palette')} className="space-y-1">
            <p className="mb-2 text-sm font-black">{t('settings.palette')}</p>
            {PALETTE_IDS.map((id) => {
              const { primary, secondary, accent } = PALETTES[id]
              const selected = id === palette
              return (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setPalette(id)}
                  className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-start text-sm font-bold ${selected ? 'border-primary' : 'border-transparent'}`}
                >
                  <span className="flex gap-1" aria-hidden="true">
                    {[primary, secondary, accent].map((c) => (
                      <span key={c} className="h-5 w-5 rounded-full" style={{ background: c }} />
                    ))}
                  </span>
                  <span className="flex-1">{t(`palette.${id}`)}</span>
                  {selected && <Check size={16} className="text-primary" aria-hidden="true" />}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
