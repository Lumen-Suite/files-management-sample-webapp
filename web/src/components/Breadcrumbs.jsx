import { breadcrumbSegments } from '../lib/path.js'

export default function Breadcrumbs({ path, onNavigate }) {
  const segs = breadcrumbSegments(path)
  return (
    <nav className="flex items-center flex-wrap gap-1 text-sm mb-4" aria-label="Breadcrumb">
      {segs.map((s, i) => {
        const last = i === segs.length - 1
        return (
          <span key={s.path} className="flex items-center gap-1">
            {i > 0 && <span className="text-lumen-muted">/</span>}
            {last ? (
              <span className="font-medium text-lumen-fg">{s.name}</span>
            ) : (
              <button
                type="button"
                onClick={() => onNavigate(s.path)}
                className="text-lumen-muted hover:text-lumen-fg underline-offset-2 hover:underline"
              >
                {s.name}
              </button>
            )}
          </span>
        )
      })}
    </nav>
  )
}
