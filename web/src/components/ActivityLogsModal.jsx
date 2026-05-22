import { useEffect, useState, useCallback } from 'react'
import { api, extractError } from '../api/client.js'
import Modal from './Modal.jsx'
import Spinner from './Spinner.jsx'
import ErrorBanner from './ErrorBanner.jsx'
import EmptyState from './EmptyState.jsx'

function formatTimestamp(ts) {
  if (!ts) return '-'
  try {
    return new Date(ts).toLocaleString()
  } catch {
    return String(ts)
  }
}

export default function ActivityLogsModal({ open, itemPath, onClose }) {
  const [page, setPage] = useState(1)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    if (!itemPath) return
    setLoading(true)
    setError(null)
    try {
      const res = await api.get('/directoryItems/logs', {
        params: { path: itemPath, pageNumber: page, pageSize: 10 },
      })
      setData(res.data)
    } catch (e) {
      setError(extractError(e))
    } finally {
      setLoading(false)
    }
  }, [itemPath, page])

  useEffect(() => {
    if (open) {
      setPage(1)
      setData(null)
      setError(null)
    }
  }, [open, itemPath])

  useEffect(() => {
    if (open) load()
  }, [open, load])

  const logs = data?.Items ?? data?.Logs ?? []
  const pagination = data?.Pagination
  const totalPage = pagination?.TotalPage ?? 1

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Activity"
      size="lg"
      footer={
        <div className="flex items-center justify-between w-full text-sm">
          <div className="text-lumen-muted">
            Page {pagination?.CurrentPage ?? page} of {Math.max(1, totalPage)}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage(page - 1)}
              className="border border-lumen-border px-3 py-1 disabled:opacity-40 hover:bg-lumen-row-hover"
            >
              Prev
            </button>
            <button
              type="button"
              disabled={page >= totalPage || loading}
              onClick={() => setPage(page + 1)}
              className="border border-lumen-border px-3 py-1 disabled:opacity-40 hover:bg-lumen-row-hover"
            >
              Next
            </button>
          </div>
        </div>
      }
    >
      <ErrorBanner message={error} onRetry={load} />

      {loading ? (
        <Spinner label="Loading activity..." />
      ) : logs.length === 0 ? (
        <EmptyState title="No activity yet" message="Actions like create, rename, archive will show up here." />
      ) : (
        <ul className="space-y-2">
          {logs.map((entry) => {
            const id = entry.id ?? `${entry.Log?.Timestamp}-${entry.Log?.Action}`
            const log = entry.Log ?? entry
            return (
              <li key={id} className="border border-lumen-border p-3">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <div className="font-medium text-lumen-fg">{log.Action ?? 'ACTION'}</div>
                  <div className="text-xs text-lumen-muted">{formatTimestamp(log.Timestamp)}</div>
                </div>
                <div className="text-xs text-lumen-muted mt-1">
                  By: {log.PerformedBy?.Name ?? log.PerformedBy?.ID ?? '-'}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </Modal>
  )
}
