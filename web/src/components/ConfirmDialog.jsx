import { useState } from 'react'
import Modal from './Modal.jsx'

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'warning',
  onConfirm,
  onClose,
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const confirmClass =
    tone === 'danger'
      ? 'bg-lumen-error text-white hover:opacity-90'
      : 'bg-lumen-fg text-lumen-bg hover:opacity-90'

  const close = () => {
    if (busy) return
    setError(null)
    onClose()
  }

  const handleConfirm = async () => {
    setBusy(true)
    setError(null)
    try {
      await onConfirm?.()
      onClose()
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || 'Action failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title={title}
      size="sm"
      footer={
        <>
          <button
            type="button"
            onClick={close}
            disabled={busy}
            className="border border-lumen-border px-4 py-2 text-sm hover:bg-lumen-row-hover disabled:opacity-40"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={busy}
            className={`px-4 py-2 text-sm disabled:opacity-40 ${confirmClass}`}
          >
            {busy ? 'Working...' : confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-sm text-lumen-fg">{message}</p>
      {tone === 'danger' && (
        <p className="text-xs text-lumen-error mt-3">This cannot be undone.</p>
      )}
      {error && <p className="text-sm text-lumen-error mt-3">{error}</p>}
    </Modal>
  )
}
