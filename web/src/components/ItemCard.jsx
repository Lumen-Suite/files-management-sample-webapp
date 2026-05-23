function FolderIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
    </svg>
  )
}

function FileIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" />
      <path d="M14 3v5h5" />
    </svg>
  )
}

function InfoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8h.01M11 12h1v5h1" />
    </svg>
  )
}

export default function ItemCard({ item, onOpen, onShowDetails }) {
  const isFolder = item.Type === 'folder' || item.FolderType !== undefined
  const ext = item.FileExtension ? '.' + String(item.FileExtension).toUpperCase() : ''

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(item)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen(item)
        }
      }}
      className="text-left border border-lumen-border hover:border-lumen-fg p-4 flex items-start gap-3 bg-white hover:bg-lumen-row-hover transition-colors cursor-pointer"
    >
      <div className="text-lumen-fg shrink-0">{isFolder ? <FolderIcon /> : <FileIcon />}</div>
      <div className="min-w-0 flex-1">
        <div className="font-medium text-lumen-fg truncate">{item.Name ?? '-'}</div>
        <div className="text-xs text-lumen-muted mt-1">
          {isFolder ? (item.FolderType ?? 'folder') : 'file' + ext}
        </div>
      </div>
      {isFolder && onShowDetails && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onShowDetails(item)
          }}
          aria-label="View folder details"
          title="View folder details"
          className="shrink-0 text-lumen-muted hover:text-lumen-fg w-7 h-7 flex items-center justify-center border border-transparent hover:border-lumen-border"
        >
          <InfoIcon />
        </button>
      )}
    </div>
  )
}
