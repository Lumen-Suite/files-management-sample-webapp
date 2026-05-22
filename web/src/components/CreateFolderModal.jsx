import { useState } from 'react'
import { api, extractError } from '../api/client.js'
import Modal from './Modal.jsx'

export default function CreateFolderModal({ open, currentPath, onClose, onCreated }) {
  const [name, setName] = useState('')
  const [folderType, setFolderType] = useState('directory')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const reset = () => {
    setName('')
    setFolderType('directory')
    setError(null)
    setSubmitting(false)
  }

  const close = () => {
    if (submitting) return
    reset()
    onClose()
  }

  const submit = async (e) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Folder name is required.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await api.post(`/folder/create?path=${encodeURIComponent(currentPath)}`, {
        Name: trimmed,
        Path: currentPath,
        FolderType: folderType,
      })
      reset()
      onCreated?.()
      onClose()
    } catch (e) {
      setError(extractError(e))
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title="Create folder"
      size="sm"
      footer={
        <>
          <button
            type="button"
            onClick={close}
            disabled={submitting}
            className="border border-lumen-border px-4 py-2 text-sm hover:bg-lumen-row-hover disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="create-folder-form"
            disabled={submitting}
            className="bg-lumen-fg text-lumen-bg px-4 py-2 text-sm hover:opacity-90 disabled:opacity-40"
          >
            {submitting ? 'Creating...' : 'Create'}
          </button>
        </>
      }
    >
      <form id="create-folder-form" onSubmit={submit} className="space-y-4">
        <label className="block">
          <span className="text-xs uppercase tracking-wider text-lumen-muted">Name</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            disabled={submitting}
            placeholder="e.g. quarterly reports"
            className="mt-1 w-full border border-lumen-border focus:border-lumen-fg outline-none px-3 py-2 text-sm"
          />
        </label>

        <label className="block">
          <span className="text-xs uppercase tracking-wider text-lumen-muted">Folder type</span>
          <select
            value={folderType}
            onChange={(e) => setFolderType(e.target.value)}
            disabled={submitting}
            className="mt-1 w-full border border-lumen-border px-3 py-2 text-sm"
          >
            <option value="directory">directory (regular folder)</option>
            <option value="collection">collection (top-level grouping)</option>
          </select>
        </label>

        <div className="text-xs text-lumen-muted">
          Will be created inside: <code className="font-mono">{currentPath}</code>
        </div>

        {error && <div className="text-sm text-lumen-error">{error}</div>}
      </form>
    </Modal>
  )
}
