import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api, extractError } from '../api/client.js'
import { ROOT, normalize, joinPath } from '../lib/path.js'
import Spinner from '../components/Spinner.jsx'
import ErrorBanner from '../components/ErrorBanner.jsx'
import EmptyState from '../components/EmptyState.jsx'
import Pagination from '../components/Pagination.jsx'
import SearchSortBar from '../components/SearchSortBar.jsx'
import Breadcrumbs from '../components/Breadcrumbs.jsx'
import DirectoryGrid from '../components/DirectoryGrid.jsx'
import UploadDropzone from '../components/UploadDropzone.jsx'
import CreateFolderModal from '../components/CreateFolderModal.jsx'
import ItemDetailModal from '../components/ItemDetailModal.jsx'

const SORT_OPTIONS = [
  { value: 'Name', label: 'Name' },
  { value: '_ts', label: 'Recently changed' },
  { value: 'FileExtension', label: 'Extension' },
  { value: 'CreatedAt', label: 'Created' },
]

export default function Browse() {
  const [params, setParams] = useSearchParams()

  const path = normalize(params.get('path') || ROOT)
  const pageNumber = Number(params.get('pageNumber') || 1)
  const pageSize = Number(params.get('pageSize') || 12)
  const search = params.get('search') || ''
  const sortField = params.get('sort[0][field]') || ''
  const sortOrder = params.get('sort[0][order]') || 'asc'

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showUpload, setShowUpload] = useState(false)
  const [showCreateFolder, setShowCreateFolder] = useState(false)
  const [activeItem, setActiveItem] = useState(null)

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
      const res = await api.get('/directoryItems', { params: query })
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

  const navigate = (newPath) => {
    updateParams({ path: newPath, pageNumber: 1, search: '' })
  }

  const onOpenItem = (item) => {
    const isFolder = item.Type === 'folder' || item.FolderType !== undefined
    if (isFolder) {
      navigate(joinPath(path, item.Name))
    } else {
      setActiveItem(item)
    }
  }

  const items = data?.Items ?? data?.items ?? []
  const pagination = data?.Pagination ?? data?.pagination

  return (
    <div>
      <header className="mb-4 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Files</h1>
          <p className="text-sm text-lumen-muted mt-1">
            Browse, upload, and organize files owned by your organization.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowCreateFolder(true)}
            className="border border-lumen-fg px-4 py-2 text-sm hover:bg-lumen-row-hover"
          >
            New folder
          </button>
          <button
            type="button"
            onClick={() => setShowUpload((s) => !s)}
            className="bg-lumen-fg text-lumen-bg px-4 py-2 text-sm hover:opacity-90"
          >
            {showUpload ? 'Hide upload' : 'Upload'}
          </button>
        </div>
      </header>

      <Breadcrumbs path={path} onNavigate={navigate} />

      {showUpload && (
        <div className="mb-6">
          <UploadDropzone currentPath={path} onUploaded={load} />
        </div>
      )}

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
        placeholder="Search this folder..."
      />

      <ErrorBanner message={error} onRetry={load} />

      {loading ? (
        <Spinner label="Loading folder..." />
      ) : items.length === 0 ? (
        <EmptyState
          title={search ? 'No items match your search' : 'This folder is empty'}
          message={
            search
              ? 'Try a different search term or clear the search box.'
              : 'Upload some files or create a folder to get started.'
          }
        />
      ) : (
        <DirectoryGrid items={items} onOpen={onOpenItem} />
      )}

      <Pagination
        pagination={pagination}
        pageSize={pageSize}
        onPageChange={(p) => updateParams({ pageNumber: p })}
        onPageSizeChange={(s) => updateParams({ pageSize: s, pageNumber: 1 })}
      />

      <CreateFolderModal
        open={showCreateFolder}
        currentPath={path}
        onClose={() => setShowCreateFolder(false)}
        onCreated={load}
      />

      <ItemDetailModal
        open={activeItem !== null}
        item={activeItem}
        currentPath={path}
        onClose={() => setActiveItem(null)}
        onChanged={load}
      />
    </div>
  )
}
