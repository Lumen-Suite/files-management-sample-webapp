import { useState } from 'react'
import { api, extractError } from '../api/client.js'
import Modal from './Modal.jsx'
import ConfirmDialog from './ConfirmDialog.jsx'
import EditMetadataModal from './EditMetadataModal.jsx'
import ActivityLogsModal from './ActivityLogsModal.jsx'
import { joinPath } from '../lib/path.js'

function Row({ label, value, mono }) {
  return (
    <div className="grid grid-cols-3 gap-3 py-2 border-b border-lumen-border last:border-b-0">
      <div className="text-xs uppercase tracking-wider text-lumen-muted">{label}</div>
      <div className={`col-span-2 text-sm break-all ${mono ? 'font-mono' : ''}`}>{value ?? '-'}</div>
    </div>
  )
}

export default function ItemDetailModal({ open, item, currentPath, onClose, onChanged }) {
  const [confirm, setConfirm] = useState(null)
  const [editing, setEditing] = useState(false)
  const [logs, setLogs] = useState(false)

  if (!item) return null

  const isFolder = item.Type === 'folder' || item.FolderType !== undefined
  const itemPath = joinPath(currentPath, item.Name)

  const doArchive = async () => {
    await api.delete(`/file/archive?path=${encodeURIComponent(itemPath)}`)
    onChanged?.()
  }

  const doDelete = async () => {
    await api.delete(`/file/delete?path=${encodeURIComponent(itemPath)}`)
    onChanged?.()
  }

  return (
    <>
      <Modal
        open={open && !editing && !logs && !confirm}
        onClose={onClose}
        title={isFolder ? 'Folder details' : 'File details'}
        size="md"
        footer={
          <>
            {!isFolder && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="border border-lumen-border px-3 py-2 text-sm hover:bg-lumen-row-hover"
              >
                Edit details
              </button>
            )}
            <button
              type="button"
              onClick={() => setLogs(true)}
              className="border border-lumen-border px-3 py-2 text-sm hover:bg-lumen-row-hover"
            >
              View activity
            </button>
            {!isFolder && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    setConfirm({
                      tone: 'warning',
                      title: 'Archive this file?',
                      message:
                        'Archived files move out of this folder. You can restore them later from the Archive page.',
                      confirmLabel: 'Archive',
                      action: doArchive,
                    })
                  }
                  className="border border-lumen-border px-3 py-2 text-sm hover:bg-lumen-row-hover"
                >
                  Archive
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setConfirm({
                      tone: 'danger',
                      title: 'Permanently delete?',
                      message: 'This will remove the file entirely. Archive instead if you might want it back.',
                      confirmLabel: 'Permanently delete',
                      action: doDelete,
                    })
                  }
                  className="bg-lumen-error text-white px-3 py-2 text-sm hover:opacity-90"
                >
                  Delete
                </button>
              </>
            )}
          </>
        }
      >
        <Row label="Name" value={item.Name} />
        <Row label="Type" value={isFolder ? item.FolderType ?? 'folder' : 'file'} />
        <Row label="ID" value={item.id ?? item.Id} mono />
        <Row label="Path" value={item.Path ?? currentPath} mono />
        {!isFolder && <Row label="Extension" value={item.FileExtension} />}
        {!isFolder && <Row label="Checksum" value={item.Checksum} mono />}
        <Row label="Owner address" value={item.OwnerAddress} mono />
        {item.Price && (
          <Row
            label="Price"
            value={`${item.Price.Price ?? ''} ${item.Price.Coin || item.Price.Fiat || item.Price.Currency || ''}`}
          />
        )}
        {item.Description && <Row label="Description" value={item.Description} />}
      </Modal>

      <EditMetadataModal
        open={editing}
        item={item}
        currentPath={currentPath}
        onClose={() => setEditing(false)}
        onSaved={() => {
          setEditing(false)
          onChanged?.()
          onClose()
        }}
      />

      <ActivityLogsModal
        open={logs}
        itemPath={itemPath}
        onClose={() => setLogs(false)}
      />

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.title ?? ''}
        message={confirm?.message ?? ''}
        tone={confirm?.tone ?? 'warning'}
        confirmLabel={confirm?.confirmLabel ?? 'Confirm'}
        onConfirm={async () => {
          await confirm.action()
        }}
        onClose={() => {
          const wasOpen = !!confirm
          setConfirm(null)
          if (wasOpen) onClose()
        }}
      />
    </>
  )
}
