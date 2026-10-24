import { ChevronDown } from 'lucide-react'
import { useId } from 'react'

// A single accordion row. The parent owns the open state, so several items can
// share one `openId` and behave like a "only one open at a time" accordion.
export default function AccordionItem({ open, onToggle, title, meta, children, className = '' }) {
  const uid = useId()
  const panelId = `${uid}-panel`
  const buttonId = `${uid}-button`

  return (
    <div
      className={`overflow-hidden rounded-2xl border bg-card transition-colors ${
        open ? 'border-primary/40' : 'border-border'
      } ${className}`}
    >
      <h3>
        <button
          id={buttonId}
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-start transition-colors hover:bg-muted/60"
        >
          <span className="min-w-0 break-words text-base font-black text-foreground" dir="auto">
            {title}
          </span>
          <span className="flex shrink-0 items-center gap-3">
            {meta && <span className="text-sm font-bold text-muted-foreground">{meta}</span>}
            <ChevronDown
              size={18}
              aria-hidden="true"
              className={`text-primary transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
            />
          </span>
        </button>
      </h3>
      {open && (
        <div id={panelId} role="region" aria-labelledby={buttonId} className="border-t border-border p-3">
          {children}
        </div>
      )}
    </div>
  )
}
