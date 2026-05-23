import { useRef, useState } from 'react'
import axios from 'axios'
import { api, extractError } from '../api/client.js'
import { computeMd5Base64, stripExt, extOf } from '../lib/md5.js'

const BATCH_LIMIT = 50
const BATCH_CONCURRENCY = 3

function nextId() {
  return Math.random().toString(36).slice(2, 10)
}

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
        .finally(() => { completed++; runNext() })
    }
    for (let i = 0; i < Math.min(limit, tasks.length); i++) runNext()
    if (tasks.length === 0) resolve(results)
  })
}

function SingleFileForm({ currentPath, onUploaded }) {
  const [file, setFile] = useState(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)
  const [stage, setStage] = useState('idle')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef(null)

  const pick = (chosen) => {
    if (!chosen) return
    setFile(chosen)
    setName(stripExt(chosen.name))
    setDescription('')
    setError(null)
    setSuccess(null)
    setStage('idle')
    setProgress(0)
  }

  const reset = () => {
    setFile(null)
    setName('')
    setDescription('')
    setStage('idle')
    setProgress(0)
    setError(null)
  }

  const trimmedName = name.trim()
  const canUpload = !busy && trimmedName.length > 0

  const upload = async () => {
    if (!file || !trimmedName) return
    setBusy(true)
    setError(null)
    setSuccess(null)
    try {
      setStage('hashing')
      const Checksum = await computeMd5Base64(file)

      setStage('requesting-sas')
      const { data } = await api.post(
        `/file/create?path=${encodeURIComponent(currentPath || '/')}`,
        {
          Name: trimmedName,
          FileExtension: extOf(file.name) || 'bin',
          Checksum,
          Description: description,
        },
      )

      setStage('uploading')
      setProgress(0)
      await axios.put(data.SASURL, file, {
        headers: {
          'x-ms-blob-type': 'BlockBlob',
          'x-ms-blob-content-md5': Checksum,
          'Content-Type': file.type || 'application/octet-stream',
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        onUploadProgress: (e) => {
          if (e.total) setProgress(Math.round((e.loaded / e.total) * 100))
        },
      })

      setStage('done')
      setProgress(100)
      setSuccess({ name: trimmedName, original: file.name, workflowId: data.WorkflowID })
      setFile(null)
      setName('')
      setDescription('')
      onUploaded?.()
    } catch (e) {
      setStage('error')
      setError(extractError(e))
    } finally {
      setBusy(false)
    }
  }

  const labelForStage = {
    idle: 'Ready',
    hashing: 'Calculating fingerprint...',
    'requesting-sas': 'Getting an upload slot...',
    uploading: 'Uploading...',
    done: 'Uploaded',
    error: 'Failed',
  }

  const ext = file ? (extOf(file.name) || 'bin') : ''

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); if (!busy) setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setIsDragging(false)
          if (busy) return
          pick(e.dataTransfer.files?.[0])
        }}
        className={`border-2 border-dashed p-8 text-center transition-colors ${
          isDragging ? 'border-lumen-fg bg-lumen-subtle' : 'border-lumen-border'
        }`}
      >
        <div className="text-sm font-medium text-lumen-fg mb-2">Drop a file here to upload</div>
        <div className="text-xs text-lumen-muted mb-4">or</div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="border border-lumen-fg px-4 py-2 text-sm hover:bg-lumen-fg hover:text-lumen-bg disabled:opacity-40"
        >
          Choose a file
        </button>
        <input
          ref={inputRef}
          type="file"
          onChange={(e) => { pick(e.target.files?.[0]); e.target.value = '' }}
          className="hidden"
          aria-hidden
        />
        <div className="text-xs text-lumen-muted mt-3">
          One file at a time. Uploads go straight to Azure storage; the Express server never sees the file bytes.
        </div>
      </div>

      {file && (
        <div className="mt-4 border border-lumen-border p-4 space-y-3">
          <div className="flex items-center justify-between gap-3 text-sm">
            <div className="min-w-0 flex-1">
              <div className="font-medium truncate">{file.name}</div>
              <div className="text-xs text-lumen-muted">
                {(file.size / 1024).toFixed(1)} KB &middot; {labelForStage[stage]}
              </div>
            </div>
            {!busy && stage !== 'done' && (
              <button type="button" onClick={reset} className="text-xs text-lumen-muted hover:text-lumen-fg">
                Remove
              </button>
            )}
          </div>

          {stage !== 'done' && (
            <>
              <label className="block">
                <span className="text-xs uppercase tracking-wider text-lumen-muted">Name</span>
                <div className="mt-1 flex items-stretch border border-lumen-border focus-within:border-lumen-fg">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="File name"
                    disabled={busy}
                    maxLength={255}
                    className="flex-1 px-3 py-2 text-sm outline-none disabled:opacity-60"
                  />
                  {ext && (
                    <span className="px-3 py-2 text-sm text-lumen-muted border-l border-lumen-border bg-lumen-subtle font-mono">
                      .{ext}
                    </span>
                  )}
                </div>
                <span className="block text-xs text-lumen-muted mt-1">
                  Defaults to the file's name without the extension. You can change it before upload — the extension stays the same.
                </span>
                {!trimmedName && (
                  <span className="block text-xs text-lumen-error mt-1">Name is required.</span>
                )}
              </label>

              <label className="block">
                <span className="text-xs uppercase tracking-wider text-lumen-muted">Description (optional)</span>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  disabled={busy}
                  className="mt-1 w-full border border-lumen-border focus:border-lumen-fg outline-none px-3 py-2 text-sm"
                />
              </label>
            </>
          )}

          {(stage === 'uploading' || stage === 'done') && (
            <div className="h-1.5 bg-lumen-subtle overflow-hidden border border-lumen-border">
              <div
                className="h-full bg-lumen-fg"
                style={{ width: `${progress}%`, transition: 'width 120ms linear' }}
              />
            </div>
          )}

          {stage !== 'done' && (
            <button
              type="button"
              onClick={upload}
              disabled={!canUpload}
              className="w-full bg-lumen-fg text-lumen-bg px-4 py-2 text-sm hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {busy ? labelForStage[stage] : 'Upload'}
            </button>
          )}
        </div>
      )}

      {error && (
        <div className="mt-4 border border-lumen-error p-3 text-sm">
          <div className="font-medium text-lumen-error mb-1">Upload failed</div>
          <div className="break-words">{error}</div>
        </div>
      )}

      {success && (
        <div className="mt-4 border border-lumen-success p-3 text-sm">
          <div className="font-medium text-lumen-success mb-1">Uploaded</div>
          <div className="text-lumen-fg">
            {success.name}
            {success.original && success.original !== success.name && (
              <span className="text-xs text-lumen-muted ml-2">(was {success.original})</span>
            )}
          </div>
          {success.workflowId && (
            <div className="text-xs text-lumen-muted mt-1">
              Workflow: <code className="font-mono">{success.workflowId}</code>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function BatchFileForm({ currentPath, onUploaded }) {
  const [rows, setRows] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef(null)

  const addFiles = (fileList) => {
    if (!fileList || fileList.length === 0) return
    const incoming = Array.from(fileList).slice(0, BATCH_LIMIT - rows.length)
    const newRows = incoming.map((file) => ({
      id: nextId(),
      file,
      name: stripExt(file.name),
      description: '',
      status: 'idle',
      progress: 0,
      error: null,
      workflowId: null,
    }))
    setRows((prev) => [...prev, ...newRows].slice(0, BATCH_LIMIT))
    setError(null)
  }

  const updateRow = (id, patch) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))

  const removeRow = (id) => setRows((prev) => prev.filter((r) => r.id !== id))
  const clearAll = () => setRows([])

  const validRows = rows.filter((r) => r.name.trim().length > 0)
  const canUpload = !busy && validRows.length > 0 && validRows.length === rows.length

  const upload = async () => {
    if (!canUpload) return
    setBusy(true)
    setError(null)

    let metadataByRow = []
    try {
      metadataByRow = await Promise.all(
        rows.map(async (r) => {
          updateRow(r.id, { status: 'hashing' })
          const Checksum = await computeMd5Base64(r.file)
          return {
            id: r.id,
            Checksum,
            entry: {
              Name: r.name.trim(),
              FileExtension: extOf(r.file.name) || 'bin',
              Checksum,
              Description: r.description,
            },
          }
        }),
      )

      for (const m of metadataByRow) updateRow(m.id, { status: 'requesting-sas' })

      const { data } = await api.post(
        `/files/create?path=${encodeURIComponent(currentPath || '/')}`,
        { Files: metadataByRow.map((m) => m.entry) },
      )

      const responseFiles = data?.Files ?? data?.files ?? []

      const tasks = metadataByRow.map((m, idx) => async () => {
        const resp = responseFiles[idx] ?? {}
        const sasUrl = resp.SASURL || resp.SasURL || resp.sasURL
        const workflowId = resp.WorkflowID || resp.workflowID
        if (!sasUrl) {
          updateRow(m.id, { status: 'error', error: 'No SAS URL returned for this file.' })
          return
        }
        updateRow(m.id, { status: 'uploading', progress: 0, workflowId })
        try {
          const row = rows.find((r) => r.id === m.id)
          await axios.put(sasUrl, row.file, {
            headers: {
              'x-ms-blob-type': 'BlockBlob',
              'x-ms-blob-content-md5': m.Checksum,
              'Content-Type': row.file.type || 'application/octet-stream',
            },
            maxBodyLength: Infinity,
            maxContentLength: Infinity,
            onUploadProgress: (e) => {
              if (e.total) updateRow(m.id, { progress: Math.round((e.loaded / e.total) * 100) })
            },
          })
          updateRow(m.id, { status: 'done', progress: 100 })
        } catch (e) {
          updateRow(m.id, { status: 'error', error: extractError(e) })
        }
      })

      await withConcurrencyLimit(tasks, BATCH_CONCURRENCY)
      onUploaded?.()
    } catch (e) {
      setError(extractError(e))
      for (const m of metadataByRow) updateRow(m.id, { status: 'error', error: extractError(e) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); if (!busy) setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setIsDragging(false)
          if (busy) return
          addFiles(e.dataTransfer.files)
        }}
        className={`border-2 border-dashed p-8 text-center transition-colors ${
          isDragging ? 'border-lumen-fg bg-lumen-subtle' : 'border-lumen-border'
        }`}
      >
        <div className="text-sm font-medium text-lumen-fg mb-2">Drop files here to upload</div>
        <div className="text-xs text-lumen-muted mb-4">or</div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy || rows.length >= BATCH_LIMIT}
          className="border border-lumen-fg px-4 py-2 text-sm hover:bg-lumen-fg hover:text-lumen-bg disabled:opacity-40"
        >
          Choose files
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          onChange={(e) => { addFiles(e.target.files); e.target.value = '' }}
          className="hidden"
          aria-hidden
        />
        <div className="text-xs text-lumen-muted mt-3">
          Up to {BATCH_LIMIT} files per batch. Uploads go straight to Azure storage; the Express server never sees the file bytes.
        </div>
      </div>

      {rows.length > 0 && (
        <div className="mt-4 border border-lumen-border">
          <div className="flex items-center justify-between px-4 py-2 border-b border-lumen-border bg-lumen-subtle">
            <div className="text-sm font-medium">
              {rows.length} file{rows.length === 1 ? '' : 's'} ({validRows.length} valid)
            </div>
            {!busy && (
              <button type="button" onClick={clearAll} className="text-sm text-lumen-muted hover:text-lumen-fg">
                Clear list
              </button>
            )}
          </div>
          <ul className="max-h-96 overflow-y-auto">
            {rows.map((r) => {
              const ext = extOf(r.file.name) || 'bin'
              const trimmed = r.name.trim()
              return (
                <li key={r.id} className="px-4 py-3 border-b border-lumen-border last:border-b-0 space-y-2">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">{r.file.name}</div>
                      <div className="text-xs text-lumen-muted">
                        {(r.file.size / 1024).toFixed(1)} KB &middot; {r.status === 'done' ? 'uploaded' : r.status.replace('-', ' ')}
                      </div>
                    </div>
                    {!busy && r.status !== 'done' && (
                      <button
                        type="button"
                        onClick={() => removeRow(r.id)}
                        className="text-xs text-lumen-muted hover:text-lumen-fg"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  {r.status === 'idle' && (
                    <>
                      <label className="block">
                        <span className="text-xs uppercase tracking-wider text-lumen-muted">Name</span>
                        <div className="mt-1 flex items-stretch border border-lumen-border focus-within:border-lumen-fg">
                          <input
                            type="text"
                            value={r.name}
                            onChange={(e) => updateRow(r.id, { name: e.target.value })}
                            disabled={busy}
                            maxLength={255}
                            className="flex-1 px-3 py-2 text-sm outline-none disabled:opacity-60"
                          />
                          <span className="px-3 py-2 text-sm text-lumen-muted border-l border-lumen-border bg-lumen-subtle font-mono">
                            .{ext}
                          </span>
                        </div>
                        {!trimmed && (
                          <span className="block text-xs text-lumen-error mt-1">Name is required.</span>
                        )}
                      </label>
                      <label className="block">
                        <span className="text-xs uppercase tracking-wider text-lumen-muted">Description (optional)</span>
                        <textarea
                          value={r.description}
                          onChange={(e) => updateRow(r.id, { description: e.target.value })}
                          rows={2}
                          disabled={busy}
                          className="mt-1 w-full border border-lumen-border focus:border-lumen-fg outline-none px-3 py-2 text-sm"
                        />
                      </label>
                    </>
                  )}

                  {(r.status === 'uploading' || r.status === 'done') && (
                    <div className="h-1.5 bg-lumen-subtle overflow-hidden border border-lumen-border">
                      <div
                        className={`h-full ${r.status === 'error' ? 'bg-lumen-error' : 'bg-lumen-fg'}`}
                        style={{ width: `${r.status === 'done' ? 100 : r.progress}%`, transition: 'width 120ms linear' }}
                      />
                    </div>
                  )}

                  {r.error && <div className="text-xs text-lumen-error">{r.error}</div>}
                  {r.status === 'done' && r.workflowId && (
                    <div className="text-xs text-lumen-muted">
                      Workflow: <code className="font-mono">{r.workflowId}</code>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {error && (
        <div className="mt-4 border border-lumen-error p-3 text-sm">
          <div className="font-medium text-lumen-error mb-1">Batch failed</div>
          <div className="break-words">{error}</div>
        </div>
      )}

      <button
        type="button"
        onClick={upload}
        disabled={!canUpload}
        className="mt-4 w-full bg-lumen-fg text-lumen-bg px-4 py-2 text-sm hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {busy ? 'Uploading batch...' : `Upload ${validRows.length} file${validRows.length === 1 ? '' : 's'}`}
      </button>
    </div>
  )
}

export default function UploadDropzone({ currentPath, onUploaded }) {
  const [multi, setMulti] = useState(false)
  return (
    <div>
      <div className="flex items-center justify-end mb-3">
        <label className="inline-flex items-center gap-2 text-sm text-lumen-muted">
          <input
            type="checkbox"
            checked={multi}
            onChange={(e) => setMulti(e.target.checked)}
          />
          <span>Multiple files</span>
        </label>
      </div>
      {multi ? (
        <BatchFileForm currentPath={currentPath} onUploaded={onUploaded} />
      ) : (
        <SingleFileForm currentPath={currentPath} onUploaded={onUploaded} />
      )}
    </div>
  )
}
