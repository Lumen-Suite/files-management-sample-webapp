import { useState, useEffect } from 'react'
import { api, extractError } from '../api/client.js'
import Modal from './Modal.jsx'
import { joinPath } from '../lib/path.js'

export default function EditMetadataModal({ open, item, currentPath, onClose, onSaved }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (open && item) {
      setName(item.Name ?? '')
      setDescription(item.Description ?? '')
      setError(null)
    }
  }, [open, item])

  const close = () => {
    if (busy) return
    onClose()
  }

  const submit = async (e) => {
    e.preventDefault()
    const payload = {}
    const newName = name.trim()
    if (newName && newName !== item.Name) payload.NewDirectoryItemName = newName
    if (description !== (item.Description ?? '')) payload.Description = description
    if (Object.keys(payload).length === 0) {
      setError('Change at least the name or the description.')
      return
    }

    setBusy(true)
    setError(null)
    try {
      const itemPath = joinPath(currentPath, item.Name)
      await api.patch(`/file/metadata?path=${encodeURIComponent(itemPath)}`, payload)
      onSaved?.()
      onClose()
    } catch (e) {
      setError(extractError(e))
    } finally {
      setBusy(false)
    }
  }

  if (!item) return null

  return (
    <Modal
      open={open}
      onClose={close}
      title="Edit file details"
      size="sm"
      footer={
        <>
          <button
            type="button"
            onClick={close}
            disabled={busy}
            className="border border-lumen-border px-4 py-2 text-sm hover:bg-lumen-row-hover disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="edit-metadata-form"
            disabled={busy}
            className="bg-lumen-fg text-lumen-bg px-4 py-2 text-sm hover:opacity-90 disabled:opacity-40"
          >
            {busy ? 'Saving...' : 'Save'}
          </button>
        </>
      }
    >
      <form id="edit-metadata-form" onSubmit={submit} className="space-y-4">
        <label className="block">
          <span className="text-xs uppercase tracking-wider text-lumen-muted">Name</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={busy}
            className="mt-1 w-full border border-lumen-border focus:border-lumen-fg outline-none px-3 py-2 text-sm"
          />
        </label>

        <label className="block">
          <span className="text-xs uppercase tracking-wider text-lumen-muted">Description</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            disabled={busy}
            className="mt-1 w-full border border-lumen-border focus:border-lumen-fg outline-none px-3 py-2 text-sm"
          />
        </label>

        {error && <div className="text-sm text-lumen-error">{error}</div>}
      </form>
    </Modal>
  )
}
