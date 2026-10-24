import { createContext, useContext, useEffect, useRef, useState } from 'react'

const MenuContext = createContext(() => {})

export default function DropdownMenu({ trigger, children, align = 'end', label, className = '' }) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) setOpen(false)
    }
    const handleEscape = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  const alignmentClass = align === 'end' ? 'end-0' : 'start-0'

  return (
    <div className="relative" ref={containerRef}>
      <div onClick={() => setOpen((prev) => !prev)} aria-expanded={open} aria-haspopup="menu">
        {trigger}
      </div>
      {open && (
        <div
          role="menu"
          aria-label={label}
          className={`absolute ${alignmentClass} top-full z-40 mt-2 min-w-[200px] max-w-[calc(100vw-1.5rem)] space-y-1 rounded-xl border border-border bg-card p-2 shadow-xl ${className}`}
        >
          <MenuContext.Provider value={() => setOpen(false)}>{children}</MenuContext.Provider>
        </div>
      )}
    </div>
  )
}

export function DropdownMenuItem({ children, onClick, icon: Icon, danger = false }) {
  const close = useContext(MenuContext)
  return (
    <button
      type="button"
      role="menuitem"
      onClick={() => {
        onClick?.()
        close()
      }}
      className={`flex min-h-[40px] w-full items-center gap-3 rounded-lg px-3 py-2 text-start text-sm font-bold transition hover:bg-muted ${danger ? 'text-red-600' : ''}`}
    >
      {Icon && <Icon size={18} className={danger ? '' : 'text-muted-foreground'} aria-hidden="true" />}
      <span className="min-w-0 break-words">{children}</span>
    </button>
  )
}
