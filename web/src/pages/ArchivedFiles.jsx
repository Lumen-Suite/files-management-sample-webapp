import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api, extractError } from '../api/client.js'
import { ROOT, normalize } from '../lib/path.js'
import Spinner from '../components/Spinner.jsx'
import ErrorBanner from '../components/ErrorBanner.jsx'
import EmptyState from '../components/EmptyState.jsx'
import Pagination from '../components/Pagination.jsx'
import SearchSortBar from '../components/SearchSortBar.jsx'

const SORT_OPTIONS = [
  { value: 'Name', label: 'Name' },
  { value: '_ts', label: 'Recently archived' },
  { value: 'FileExtension', label: 'Extension' },
]

export default function ArchivedFiles() {
  const [params, setParams] = useSearchParams()

  const path = normalize(params.get('path') || ROOT)
  const pageNumber = Number(params.get('pageNumber') || 1)
  const pageSize = Number(params.get('pageSize') || 10)
  const search = params.get('search') || ''
  const sortField = params.get('sort[0][field]') || ''
  const sortOrder = params.get('sort[0][order]') || 'desc'

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [restoring, setRestoring] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const query = { path, pageNumber, pageSize }
      if (search) query.search = search
      if (sortField) {
        query['sort[0][field]'] = sortField
        query['sort[0][order]'] = sortOrder
      }
      const res = await api.get('/archivedFiles', { params: query })
      setData(res.data)
    } catch (e) {
      setError(extractError(e))
    } finally {
      setLoading(false)
    }
  }, [path, pageNumber, pageSize, search, sortField, sortOrder])

  useEffect(() => {
    load()
  }, [load])

  const updateParams = (changes) => {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(changes)) {
      if (v === undefined || v === '' || v === null) next.delete(k)
      else next.set(k, String(v))
    }
    setParams(next)
  }

  const restore = async (entry) => {
    const archivedPath = entry.Path ?? path
    const directoryItemId = entry.DirectoryItemID ?? entry.id ?? entry.Id
    const archivedId = entry.ArchivedID ?? entry.id
    if (!directoryItemId || !archivedId) {
      setError('Cannot restore — missing ID on the archived record.')
      return
    }
    setRestoring(archivedId)
    try {
      await api.patch(`/file/restore?path=${encodeURIComponent(archivedPath)}`, {
        DirectoryItemID: String(directoryItemId),
        ArchivedID: String(archivedId),
      })
      await load()
    } catch (e) {
      setError(extractError(e))
    } finally {
      setRestoring(null)
    }
  }

  const items = data?.Items ?? data?.items ?? []
  const pagination = data?.Pagination ?? data?.pagination

  return (
    <div>
      <header className="mb-6">
        <Link to="/" className="text-sm text-lumen-muted hover:text-lumen-fg">
          &larr; Back to files
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight mt-2">Archived files</h1>
        <p className="text-sm text-lumen-muted mt-1">
          Files you archived. Restore them to bring them back, or leave them here.
        </p>
      </header>

      <SearchSortBar
        search={search}
        onSearchChange={(v) => updateParams({ search: v, pageNumber: 1 })}
        sortField={sortField}
        sortOrder={sortOrder}
        onSortChange={({ field, order }) =>
          updateParams({
            'sort[0][field]': field,
            'sort[0][order]': field ? order : undefined,
            pageNumber: 1,
          })
        }
        sortOptions={SORT_OPTIONS}
        placeholder="Search archived..."
      />

      <ErrorBanner message={error} onRetry={load} />

      {loading ? (
        <Spinner label="Loading archive..." />
      ) : items.length === 0 ? (
        <EmptyState
          title="The archive is empty"
          message="When you archive a file from the main view, it shows up here."
        />
      ) : (
        <div className="border border-lumen-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-lumen-subtle border-b border-lumen-border">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-lumen-muted uppercase text-xs tracking-wider">Name</th>
                <th className="text-left px-4 py-3 font-medium text-lumen-muted uppercase text-xs tracking-wider hidden sm:table-cell">Path</th>
                <th className="text-left px-4 py-3 font-medium text-lumen-muted uppercase text-xs tracking-wider w-32"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((entry) => {
                const archivedId = entry.ArchivedID ?? entry.id
                return (
                  <tr key={archivedId} className="border-b border-lumen-border last:border-b-0 hover:bg-lumen-row-hover">
                    <td className="px-4 py-3 font-medium">{entry.Name ?? '-'}</td>
                    <td className="px-4 py-3 hidden sm:table-cell font-mono text-lumen-muted">{entry.Path ?? '-'}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => restore(entry)}
                        disabled={restoring === archivedId}
                        className="border border-lumen-fg px-3 py-1 text-sm hover:bg-lumen-fg hover:text-lumen-bg disabled:opacity-40"
                      >
                        {restoring === archivedId ? 'Restoring...' : 'Restore'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <Pagination
        pagination={pagination}
        pageSize={pageSize}
        onPageChange={(p) => updateParams({ pageNumber: p })}
        onPageSizeChange={(s) => updateParams({ pageSize: s, pageNumber: 1 })}
      />
    </div>
  )
}
