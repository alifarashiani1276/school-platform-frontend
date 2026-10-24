import { forwardRef, useId } from 'react'

const Select = forwardRef(({ className = '', wrapperClassName = 'w-full', label, error, children, ...props }, ref) => {
  const autoId = useId()
  const id = props.id || autoId
  return (
    <div className={wrapperClassName}>
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-sm font-bold text-foreground">
          {label}
        </label>
      )}
      <select
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        ref={ref}
        className={`w-full rounded-xl border-2 border-border bg-card px-4 py-2.5 text-foreground transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50 ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''} ${className}`}
        {...props}
      >
        {children}
      </select>
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  )
})

Select.displayName = 'Select'

export default Select
