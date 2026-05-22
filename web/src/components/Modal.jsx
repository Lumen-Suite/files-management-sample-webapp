import { useEffect } from 'react'

export default function Modal({ open, onClose, title, children, footer, size = 'md' }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const widthClass = size === 'sm' ? 'max-w-md' : size === 'lg' ? 'max-w-3xl' : 'max-w-xl'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      onClick={onClose}
    >
      <div
        className={`bg-white border border-lumen-fg w-full ${widthClass} max-h-[90vh] flex flex-col`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <header className="flex items-center justify-between px-5 py-3 border-b border-lumen-border">
          <h2 className="font-semibold tracking-tight text-lumen-fg">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-lumen-muted hover:text-lumen-fg text-xl leading-none w-7 h-7"
            aria-label="Close"
          >
            x
          </button>
        </header>
        <div className="overflow-y-auto px-5 py-4 flex-1">{children}</div>
        {footer && (
          <footer className="px-5 py-3 border-t border-lumen-border flex items-center justify-end gap-2">
            {footer}
          </footer>
        )}
      </div>
    </div>
  )
}
