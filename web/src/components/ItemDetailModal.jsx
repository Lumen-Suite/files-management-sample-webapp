import { useEffect, useState } from 'react'
import { api, extractError } from '../api/client.js'
import Modal from './Modal.jsx'
import ConfirmDialog from './ConfirmDialog.jsx'
import EditMetadataModal from './EditMetadataModal.jsx'
import ActivityLogsModal from './ActivityLogsModal.jsx'
import { joinPath } from '../lib/path.js'

function Row({ label, value, mono, children }) {
  return (
    <div className="grid grid-cols-3 gap-3 py-2 border-b border-lumen-border last:border-b-0">
      <div className="text-xs uppercase tracking-wider text-lumen-muted">{label}</div>
      <div className={`col-span-2 text-sm break-all ${mono ? 'font-mono' : ''}`}>
        {children ?? value ?? '-'}
      </div>
    </div>
  )
}

function CopyButton({ value, label = 'copy' }) {
  const [copied, setCopied] = useState(false)
  if (value == null || value === '') return null
  const onClick = async (e) => {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(String(value))
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    } catch {}
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={`ml-2 text-xs ${copied ? 'text-lumen-success' : 'text-lumen-muted hover:text-lumen-fg'}`}
    >
      {copied ? '(copied)' : `(${label})`}
    </button>
  )
}

function CopyRow({ label, value, mono = true }) {
  return (
    <Row label={label}>
      {value == null || value === '' ? (
        <span>-</span>
      ) : (
        <>
          <span className={mono ? 'font-mono' : ''}>{value}</span>
          <CopyButton value={value} />
        </>
      )}
    </Row>
  )
}

function ExternalLinkRow({ label, url, linkText = 'Open' }) {
  if (!url) return null
  return (
    <Row label={label}>
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="text-lumen-fg underline-offset-2 hover:underline break-all font-mono"
      >
        {linkText}
      </a>
      <CopyButton value={url} label="copy URL" />
    </Row>
  )
}

function SectionHeading({ children }) {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-widest text-lumen-muted mt-5 mb-2">
      {children}
    </h3>
  )
}

function ClockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  )
}

function PencilIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M4 20h4l10-10-4-4L4 16v4Z" />
      <path d="m14 6 4 4" />
    </svg>
  )
}

function ArchiveIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <rect x="3" y="4" width="18" height="4" />
      <path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8" />
      <path d="M10 13h4" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M4 7h16" />
      <path d="M9 7V4h6v3" />
      <path d="M6 7v13a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  )
}

function formatTs(ts) {
  if (ts == null) return null
  const ms = typeof ts === 'number' && ts < 1e12 ? ts * 1000 : ts
  try {
    return new Date(ms).toLocaleString()
  } catch {
    return String(ts)
  }
}

function formatBytes(b) {
  if (typeof b !== 'number') return null
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  if (b < 1024 * 1024 * 1024) return `${(b / (1024 * 1024)).toFixed(1)} MB`
  return `${(b / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

export default function ItemDetailModal({ open, item: initialItem, currentPath, onClose, onChanged }) {
  const [confirm, setConfirm] = useState(null)
  const [editing, setEditing] = useState(false)
  const [logs, setLogs] = useState(false)
  const [fresh, setFresh] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshError, setRefreshError] = useState(null)

  const isFolder = !!initialItem && (initialItem.Type === 'folder' || initialItem.FolderType !== undefined)
  const item = fresh ?? initialItem

  useEffect(() => {
    if (!open || !initialItem) {
      setFresh(null)
      setRefreshError(null)
      return
    }
    let cancelled = false
    const path = joinPath(currentPath, initialItem.Name ?? initialItem.id)
    const url = isFolder ? '/folder' : '/file'
    setRefreshing(true)
    setRefreshError(null)
    api.get(url, { params: { path } })
      .then((res) => {
        if (cancelled) return
        const data = res.data?.File ?? res.data?.Folder ?? res.data
        if (data && typeof data === 'object') setFresh(data)
      })
      .catch((e) => { if (!cancelled) setRefreshError(extractError(e)) })
      .finally(() => { if (!cancelled) setRefreshing(false) })
    return () => { cancelled = true }
  }, [open, initialItem, isFolder, currentPath])

  if (!item) return null

  const itemPath = joinPath(currentPath, item.Name ?? item.id)
  const segment = item.Name ?? item.id ?? ''
  const prefixedSegment = isFolder
    ? segment
    : segment.startsWith('file-')
      ? segment
      : `file-${segment}`
  const prefixedItemPath = joinPath(currentPath, prefixedSegment)

  const ext = item.File?.Extension || item.FileExtension
  const mime = item.File?.OriginalFile?.MimeType
  const size = formatBytes(item.File?.OriginalFile?.Size)
  const fileUrl = item.FileURL || item.File?.OriginalFile?.URL
  const created = formatTs(item.CreatedTS ?? item.CreatedAt)
  const updated = formatTs(item._ts ?? item.UpdatedAt)
  const contract = item.SmartContract
  const nft = item.NFT

  const doArchive = async () => {
    await api.delete(`/file/archive?path=${encodeURIComponent(prefixedItemPath)}`)
    onChanged?.()
  }

  const doDelete = async () => {
    await api.delete(`/file/delete?path=${encodeURIComponent(prefixedItemPath)}`)
    onChanged?.()
  }

  const title = (
    <span className="flex items-center gap-2 flex-wrap min-w-0">
      <span className="truncate">{item.Name ?? (isFolder ? 'Folder details' : 'File details')}</span>
      {!isFolder && ext && (
        <span className="text-xs text-lumen-muted uppercase tracking-wider">.{ext}</span>
      )}
      {nft && (
        <span className="text-xs uppercase tracking-wider px-2 py-0.5 border border-lumen-border">NFT</span>
      )}
      {refreshing && (
        <span className="text-xs text-lumen-muted">refreshing...</span>
      )}
    </span>
  )

  return (
    <>
      <Modal
        open={open && !editing && !logs && !confirm}
        onClose={onClose}
        title={title}
        size="lg"
        footer={
          <>
            <button
              type="button"
              onClick={() => setLogs(true)}
              className="mr-auto inline-flex items-center gap-2 border border-lumen-border px-3 py-2 text-sm hover:bg-lumen-row-hover"
            >
              <ClockIcon />
              <span>View activity</span>
            </button>
            {!isFolder && (
              <>
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="inline-flex items-center gap-2 border border-lumen-border px-3 py-2 text-sm hover:bg-lumen-row-hover"
                >
                  <PencilIcon />
                  <span>Edit details</span>
                </button>
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
                  className="inline-flex items-center gap-2 border border-lumen-border px-3 py-2 text-sm hover:bg-lumen-row-hover"
                >
                  <ArchiveIcon />
                  <span>Archive</span>
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
                  className="inline-flex items-center gap-2 bg-lumen-error text-white px-3 py-2 text-sm hover:opacity-90"
                >
                  <TrashIcon />
                  <span>Delete</span>
                </button>
              </>
            )}
          </>
        }
      >
        {refreshError && (
          <div className="border border-lumen-error p-3 text-sm mb-4">
            <div className="font-medium text-lumen-error">Couldn't refresh from the server</div>
            <div className="text-xs text-lumen-muted break-words mt-1">{refreshError}</div>
            <div className="text-xs text-lumen-muted mt-1">Showing the list snapshot below.</div>
          </div>
        )}

        <SectionHeading>{isFolder ? 'Folder' : 'File'}</SectionHeading>
        <Row label="Name" value={item.Name} />
        {item.Description && <Row label="Description" value={item.Description} />}
        <Row
          label="Type"
          value={isFolder ? (item.FolderType ?? item.Type ?? 'folder') : (item.File?.Type ?? item.Type ?? 'file')}
        />
        {!isFolder && ext && <Row label="Extension" value={'.' + String(ext).toUpperCase()} />}
        {!isFolder && mime && <Row label="MIME type" value={mime} mono />}
        {!isFolder && size && <Row label="Size" value={size} />}
        {!isFolder && fileUrl && <ExternalLinkRow label="File URL" url={fileUrl} linkText="Open file" />}
        {item.Price && (
          <Row
            label="Price"
            value={`${item.Price.Price ?? '-'} ${item.Price.Coin || item.Price.Fiat || item.Price.Currency || ''}`.trim()}
          />
        )}

        <SectionHeading>Identity</SectionHeading>
        <CopyRow label="ID" value={item.id ?? item.Id} />
        <CopyRow label="Path" value={item.Path ?? currentPath} />
        <CopyRow label="Owner address" value={item.OwnerAddress} />
        {item.AdminID && <CopyRow label="Admin ID" value={item.AdminID} />}
        {item.OrganizationID && <CopyRow label="Organization" value={item.OrganizationID} />}

        {!isFolder && (item.Checksum || item.File?.Checksum || item.WorkflowID) && (
          <>
            <SectionHeading>Integrity</SectionHeading>
            {(item.Checksum || item.File?.Checksum) && (
              <CopyRow label="Checksum (MD5)" value={item.Checksum ?? item.File?.Checksum} />
            )}
            {item.WorkflowID && <CopyRow label="Workflow ID" value={item.WorkflowID} />}
          </>
        )}

        {contract && (
          <>
            <SectionHeading>Smart contract</SectionHeading>
            {contract.Network && <Row label="Network" value={contract.Network} />}
            {contract.ChainID && <Row label="Chain ID" value={contract.ChainID} mono />}
            {contract.ContractAddress && <CopyRow label="Contract address" value={contract.ContractAddress} />}
            {contract.ProxyAddress && <CopyRow label="Proxy address" value={contract.ProxyAddress} />}
            {contract.ContractID && <CopyRow label="Contract ID" value={contract.ContractID} />}
          </>
        )}

        {nft && (
          <>
            <SectionHeading>NFT</SectionHeading>
            {nft.TokenID != null && <Row label="Token ID" value={String(nft.TokenID)} mono />}
            {nft.ContractAddress && <CopyRow label="NFT contract" value={nft.ContractAddress} />}
            {nft.Network && <Row label="Network" value={nft.Network} />}
            {nft.ChainID && <Row label="Chain ID" value={nft.ChainID} mono />}
            {nft.TransactionHash && <CopyRow label="Tx hash" value={nft.TransactionHash} />}
            {nft.TokenURI && <ExternalLinkRow label="Token URI" url={nft.TokenURI} linkText="Open metadata" />}
            {nft.Inscription?.Name && <Row label="Inscription name" value={nft.Inscription.Name} />}
            {nft.Inscription?.Description && (
              <Row label="Inscription description" value={nft.Inscription.Description} />
            )}
          </>
        )}

        {(created || updated) && (
          <>
            <SectionHeading>Timestamps</SectionHeading>
            {created && <Row label="Created" value={created} />}
            {updated && <Row label="Last changed" value={updated} />}
          </>
        )}
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
