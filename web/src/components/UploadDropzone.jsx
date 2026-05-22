import { useRef, useState } from 'react'
import { api, extractError } from '../api/client.js'
import { computeMd5Base64, stripExt, extOf } from '../lib/md5.js'
import axios from 'axios'

const CONCURRENCY = 3

function withConcurrencyLimit(tasks, limit) {
  return new Promise((resolve) => {
    const results = new Array(tasks.length)
    let nextIndex = 0
    let completed = 0
    const runNext = () => {
      if (nextIndex >= tasks.length) {
        if (completed === tasks.length) resolve(results)
        return
      }
      const i = nextIndex++
      tasks[i]()
        .then((r) => { results[i] = { ok: true, value: r } })
        .catch((e) => { results[i] = { ok: false, error: e } })
        .finally(() => {
          completed++
          runNext()
        })
    }
    for (let i = 0; i < Math.min(limit, tasks.length); i++) runNext()
    if (tasks.length === 0) resolve(results)
  })
}

export default function UploadDropzone({ currentPath, onUploaded }) {
  const [rows, setRows] = useState([])
  const [busy, setBusy] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef(null)

  const reset = () => setRows([])

  const updateRow = (id, patch) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))

  const handleFiles = async (fileList) => {
    if (!fileList || fileList.length === 0) return
    const arr = Array.from(fileList)
    const initial = arr.map((file) => ({
      id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 8)}`,
      name: file.name,
      size: file.size,
      file,
      status: 'pending',
      progress: 0,
      error: null,
    }))
    setRows(initial)
    setBusy(true)

    const tasks = initial.map((row) => async () => {
      try {
        updateRow(row.id, { status: 'hashing' })
        const Checksum = await computeMd5Base64(row.file)

        updateRow(row.id, { status: 'requesting-sas' })
        const { data } = await api.post(
          `/file/create?path=${encodeURIComponent(currentPath)}`,
          {
            Name: stripExt(row.file.name),
            FileExtension: extOf(row.file.name) || 'bin',
            Checksum,
            Description: '',
          },
        )

        updateRow(row.id, { status: 'uploading', progress: 0 })
        await axios.put(data.SASURL, row.file, {
          headers: {
            'x-ms-blob-type': 'BlockBlob',
            'x-ms-blob-content-md5': Checksum,
            'Content-Type': row.file.type || 'application/octet-stream',
          },
          maxBodyLength: Infinity,
          maxContentLength: Infinity,
          onUploadProgress: (e) => {
            if (e.total) {
              const pct = Math.round((e.loaded / e.total) * 100)
              updateRow(row.id, { progress: pct })
            }
          },
        })

        updateRow(row.id, { status: 'done', progress: 100 })
      } catch (e) {
        updateRow(row.id, { status: 'error', error: extractError(e) })
      }
    })

    await withConcurrencyLimit(tasks, CONCURRENCY)
    setBusy(false)
    onUploaded?.()
  }

  const onDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    if (busy) return
    handleFiles(e.dataTransfer.files)
  }

  const onPick = (e) => {
    handleFiles(e.target.files)
    e.target.value = ''
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault()
          if (!busy) setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={`border-2 border-dashed p-8 text-center transition-colors ${
          isDragging ? 'border-lumen-fg bg-lumen-subtle' : 'border-lumen-border'
        }`}
      >
        <div className="text-sm font-medium text-lumen-fg mb-2">
          Drop files here to upload
        </div>
        <div className="text-xs text-lumen-muted mb-4">or</div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="border border-lumen-fg px-4 py-2 text-sm hover:bg-lumen-fg hover:text-lumen-bg disabled:opacity-40"
        >
          Choose files
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          onChange={onPick}
          className="hidden"
          aria-hidden
        />
        <div className="text-xs text-lumen-muted mt-3">
          Up to 50 files at a time. Uploads go straight to Azure storage.
        </div>
      </div>

      {rows.length > 0 && (
        <div className="mt-4 border border-lumen-border">
          <div className="flex items-center justify-between px-4 py-2 border-b border-lumen-border bg-lumen-subtle">
            <div className="text-sm font-medium">
              {rows.length} file{rows.length === 1 ? '' : 's'}
            </div>
            {!busy && (
              <button
                type="button"
                onClick={reset}
                className="text-sm text-lumen-muted hover:text-lumen-fg"
              >
                Clear list
              </button>
            )}
          </div>
          <ul>
            {rows.map((r) => (
              <li key={r.id} className="px-4 py-3 border-b border-lumen-border last:border-b-0">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <div className="truncate flex-1">{r.name}</div>
                  <div className="text-xs text-lumen-muted capitalize shrink-0">
                    {r.status === 'done' ? 'uploaded' : r.status.replace('-', ' ')}
                  </div>
                </div>
                <div className="mt-2 h-1.5 bg-lumen-subtle overflow-hidden border border-lumen-border">
                  <div
                    className={`h-full ${r.status === 'error' ? 'bg-lumen-error' : 'bg-lumen-fg'}`}
                    style={{ width: `${r.status === 'done' ? 100 : r.progress}%`, transition: 'width 120ms linear' }}
                  />
                </div>
                {r.error && <div className="text-xs text-lumen-error mt-1">{r.error}</div>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
