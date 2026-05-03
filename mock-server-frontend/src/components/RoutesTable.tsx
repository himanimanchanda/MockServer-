import React from 'react'
import type { MockDto } from '../types'

function formatMap(map?: Record<string, string>): string {
  if (!map || Object.keys(map).length === 0) return ''
  return Object.entries(map)
    .map(([k, v]) => `${k}=${v}`)
    .join(', ')
}

function stringifyJson(value: any): string {
  if (value == null) return ''
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function highlight(text: string, query: string) {
  const q = query.trim()
  if (!q) return text
  const idx = text.toLowerCase().indexOf(q.toLowerCase())
  if (idx < 0) return text
  const before = text.slice(0, idx)
  const match = text.slice(idx, idx + q.length)
  const after = text.slice(idx + q.length)
  return (
    <span>
      {before}
      <mark className="rounded bg-accent/30 px-0.5 text-accent-light">{match}</mark>
      {after}
    </span>
  )
}

function methodClass(m: string) {
  const lower = m.toLowerCase()
  if (lower === 'get') return 'method-get'
  if (lower === 'post') return 'method-post'
  if (lower === 'put') return 'method-put'
  if (lower === 'patch') return 'method-patch'
  if (lower === 'delete') return 'method-delete'
  return 'method-get'
}

export default function RoutesTable({
  mocks,
  searchQuery,
  loading,
  onEdit,
  onDelete,
  onClone,
  onViewCurl,
  onCreateFirstRoute,
  onViewQueryParams,
  onViewHeaders,
  onViewBody,
  onViewResponse,
  onTestApi,
  isTrash,
  onRecover,
}: {
  mocks: MockDto[]
  searchQuery: string
  loading?: boolean
  onEdit: (mock: MockDto) => void
  onDelete: (id: string) => void
  onClone: (mock: MockDto) => void
  onViewCurl: (mock: MockDto) => void
  onCreateFirstRoute?: () => void
  onViewQueryParams?: (mock: MockDto) => void
  onViewHeaders?: (mock: MockDto) => void
  onViewBody?: (mock: MockDto) => void
  onViewResponse?: (mock: MockDto) => void
  onTestApi?: (mock: MockDto) => void
  isTrash?: boolean
  onRecover?: (id: string) => void
}) {
  const [currentPage, setCurrentPage] = React.useState(1)
  const itemsPerPage = 20

  React.useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, mocks.length])

  const empty = mocks.length === 0
  const totalPages = Math.max(1, Math.ceil(mocks.length / itemsPerPage))
  const paginatedMocks = mocks.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  return (
    <div className="glass rounded-2xl overflow-hidden">
      <div className="border-b px-4 sm:px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3" style={{borderColor:'var(--border-color)'}}>
        <div>
          <div className="text-sm font-bold t-heading">Routes</div>
          <div className="mt-1 text-xs t-muted">All mocks for your console.</div>
        </div>
      </div>

      <div className="p-5">
        {empty && !loading && (
          <div className="mb-4 rounded-xl border border-dashed p-5" style={{borderColor:'var(--border-color)', background:'var(--bg-card)'}}>
            <div className="text-sm font-medium t-heading">No routes found</div>
            <div className="mt-1 text-sm t-secondary">Create your first route to start mocking APIs.</div>
            {onCreateFirstRoute && (
              <button
                type="button"
                className="mt-3 btn-gradient rounded-xl px-5 py-2.5 text-sm font-semibold"
                onClick={onCreateFirstRoute}
              >
                Create your first route
              </button>
            )}
          </div>
        )}

        <div className="rounded-xl border bg-[var(--bg-card)] overflow-x-auto" style={{borderColor:'var(--border-color)'}}>
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b" style={{borderColor:'var(--border-color)'}}>
                <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider t-label whitespace-nowrap">#</th>
                <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider t-label whitespace-nowrap">Method</th>
                <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider t-label whitespace-nowrap">Endpoint</th>
                <th className="hidden lg:table-cell px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider t-label whitespace-nowrap">Test Case</th>
                <th className="hidden lg:table-cell px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider t-label whitespace-nowrap">Description</th>
                <th className="hidden md:table-cell px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider t-label whitespace-nowrap">Query</th>
                <th className="hidden md:table-cell px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider t-label whitespace-nowrap">Headers</th>
                <th className="hidden md:table-cell px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider t-label whitespace-nowrap">Body</th>
                <th className="hidden md:table-cell px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider t-label whitespace-nowrap">Response</th>
                <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider t-label whitespace-nowrap">Status</th>
                <th className="px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-wider t-label whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && empty ? (
                <tr>
                  <td colSpan={11} className="px-3 py-8 text-center text-sm t-muted">
                    <div className="flex items-center justify-center gap-2">
                       <svg className="w-5 h-5 animate-spin text-accent-light" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                       </svg>
                       Loading routes...
                    </div>
                  </td>
                </tr>
              ) : empty ? null : (
                paginatedMocks.map((mock, idx) => (
                  <tr key={mock.id} className="border-b align-middle hover:bg-[var(--bg-card-hover)] transition-colors" style={{borderColor:'var(--border-color)'}}>
                    <td className="px-3 py-3 t-muted whitespace-nowrap">{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                    <td className="px-3 py-3">
                      <span className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold uppercase whitespace-nowrap ${methodClass(mock.method)}`}>
                        {mock.method}
                      </span>
                    </td>
                    <td className="px-3 py-3 font-mono text-sm t-primary break-all max-w-[200px] sm:max-w-[300px]">
                      {highlight(mock.endpoint, searchQuery)}
                    </td>
                    <td className="hidden lg:table-cell px-3 py-3 t-secondary whitespace-nowrap">{highlight(mock.testCase ?? '', searchQuery)}</td>
                    <td className="hidden lg:table-cell px-3 py-3">
                      <div className="t-muted whitespace-nowrap">{highlight(mock.description ?? '', searchQuery)}</div>
                      {mock.updatedAt && (
                        <div className="mt-1 text-[10px] text-slate-500 whitespace-nowrap">
                          {new Date(mock.updatedAt).toLocaleDateString()} {mock.updatedBy ? `by ${mock.updatedBy}` : ''}
                        </div>
                      )}
                    </td>
                    <td className="hidden md:table-cell px-3 py-3">
                      <button
                        type="button"
                        className="text-[10px] font-bold text-accent-light hover:text-accent hover:underline disabled:opacity-30"
                        onClick={() => onViewQueryParams && onViewQueryParams(mock)}
                        disabled={!onViewQueryParams}
                      >
                        {mock.queryParams && Object.keys(mock.queryParams).length > 0 ? 'View Query' : 'No Query'}
                      </button>
                    </td>
                    <td className="hidden md:table-cell px-3 py-3">
                      <button
                        type="button"
                        className="text-[10px] font-bold text-accent-light hover:text-accent hover:underline disabled:opacity-30"
                        onClick={() => onViewHeaders && onViewHeaders(mock)}
                        disabled={!onViewHeaders}
                      >
                        {mock.headers && Object.keys(mock.headers).length > 0 ? 'View Headers' : 'No Headers'}
                      </button>
                    </td>
                    <td className="hidden md:table-cell px-3 py-3">
                      <button
                        type="button"
                        className="text-[10px] font-bold text-accent-light hover:text-accent hover:underline disabled:opacity-30"
                        onClick={() => onViewBody && onViewBody(mock)}
                        disabled={!onViewBody}
                      >
                        {(mock.requestBody ?? '').trim() ? 'View Body' : 'No Body'}
                      </button>
                    </td>
                    <td className="hidden md:table-cell px-3 py-3">
                      <button
                        type="button"
                        className="text-[10px] font-bold text-accent-light hover:text-accent hover:underline disabled:opacity-30"
                        onClick={() => onViewResponse && onViewResponse(mock)}
                        disabled={!onViewResponse}
                      >
                        View JSON
                      </button>
                    </td>
                    <td className="px-3 py-3">
                      <span className="inline-block rounded-lg px-2 py-0.5 text-xs font-semibold t-heading" style={{background:'var(--bg-card)', border:'1px solid var(--border-color)'}}>{mock.statusCode}</span>
                      <div className="mt-1 text-[10px] t-muted">{mock.environment}</div>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <div className="flex flex-col items-center justify-center gap-1.5">
                        {onTestApi && (
                          <button
                            type="button"
                            className="text-xs font-semibold text-emerald-500 hover:text-emerald-400 transition-colors"
                            onClick={() => onTestApi(mock)}
                          >
                            Test
                          </button>
                        )}
                        <button
                          className="text-xs font-semibold text-blue-500 hover:text-blue-400 transition-colors"
                          onClick={() => onViewCurl(mock)}
                        >
                          Curl
                        </button>
                        {isTrash ? (
                          <button
                            className="text-xs font-semibold text-emerald-500 hover:text-emerald-400 transition-colors"
                            onClick={() => onRecover && onRecover(mock.id)}
                          >
                            Recover
                          </button>
                        ) : (
                          <>
                            <button
                              className="text-xs font-semibold text-amber-500 hover:text-amber-400 transition-colors"
                              onClick={() => onEdit(mock)}
                            >
                              Edit
                            </button>
                            <button
                              className="text-xs font-semibold t-muted hover:text-white transition-colors"
                              onClick={() => onClone(mock)}
                            >
                              Clone
                            </button>
                            <button
                              className="text-xs font-semibold text-red-500 hover:text-red-400 transition-colors ml-1"
                              onClick={() => onDelete(mock.id)}
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!empty && totalPages > 1 && (
          <div className="border-t px-5 py-4 flex items-center justify-between" style={{borderColor:'var(--border-color)'}}>
            <div className="text-xs t-muted">
              Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, mocks.length)} of {mocks.length} entries
            </div>
            <div className="flex gap-2">
              <button
                className="btn-glass rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-50"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </button>
              <div className="flex items-center px-2 text-xs font-semibold t-heading">
                Page {currentPage} of {totalPages}
              </div>
              <button
                className="btn-glass rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-50"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
