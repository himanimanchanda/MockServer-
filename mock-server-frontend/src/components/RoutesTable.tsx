import React from 'react'
import type { MockDto } from '../types'

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

function methodColor(m: string) {
  const lower = m.toLowerCase()
  if (lower === 'get') return { bg: 'rgba(34,197,94,0.15)', text: '#22c55e', border: 'rgba(34,197,94,0.3)' }
  if (lower === 'post') return { bg: 'rgba(59,130,246,0.15)', text: '#3b82f6', border: 'rgba(59,130,246,0.3)' }
  if (lower === 'put') return { bg: 'rgba(245,158,11,0.15)', text: '#f59e0b', border: 'rgba(245,158,11,0.3)' }
  if (lower === 'patch') return { bg: 'rgba(168,85,247,0.15)', text: '#a855f7', border: 'rgba(168,85,247,0.3)' }
  if (lower === 'delete') return { bg: 'rgba(239,68,68,0.15)', text: '#ef4444', border: 'rgba(239,68,68,0.3)' }
  return { bg: 'rgba(148,163,184,0.15)', text: '#94a3b8', border: 'rgba(148,163,184,0.3)' }
}

function envBadge(env: string) {
  const lower = env?.toLowerCase() ?? 'dev'
  if (lower === 'prod') return { bg: 'rgba(239,68,68,0.12)', text: '#ef4444' }
  if (lower === 'qa') return { bg: 'rgba(245,158,11,0.12)', text: '#f59e0b' }
  if (lower === 'local') return { bg: 'rgba(34,197,94,0.12)', text: '#22c55e' }
  if (lower === 'application_dev') return { bg: 'rgba(99,102,241,0.12)', text: '#6366f1' }
  return { bg: 'rgba(59,130,246,0.12)', text: '#3b82f6' }
}

/** Pretty format endpoint with path segments */
function formatEndpoint(ep: string): React.ReactNode {
  const parts = ep.split('/')
  return (
    <span className="font-mono text-[13px] break-all">
      {parts.map((part, i) => {
        const isParam = part.startsWith('{') || part.startsWith(':')
        return (
          <React.Fragment key={i}>
            {i > 0 && <span className="t-muted opacity-40">/</span>}
            {isParam ? (
              <span className="text-amber-400 font-semibold">{part}</span>
            ) : part ? (
              <span className="t-primary">{part}</span>
            ) : null}
          </React.Fragment>
        )
      })}
    </span>
  )
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
  onPermanentDelete,
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
  onPermanentDelete?: (id: string) => void
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

      <div className="p-3 sm:p-5">
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

        {loading && empty && (
          <div className="px-3 py-8 text-center text-sm t-muted">
            <div className="flex items-center justify-center gap-2">
               <svg className="w-5 h-5 animate-spin text-accent-light" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
               </svg>
               Loading routes...
            </div>
          </div>
        )}

        {/* Card-based layout for each mock route */}
        <div className="space-y-3">
          {paginatedMocks.map((mock, idx) => {
            const mc = methodColor(mock.method)
            const eb = envBadge(mock.environment)
            const hasQuery = mock.queryParams && Object.keys(mock.queryParams).length > 0
            const hasHeaders = mock.headers && Object.keys(mock.headers).length > 0
            const hasBody = (mock.requestBody ?? '').trim().length > 0

            return (
              <div
                key={mock.id}
                className="rounded-xl border transition-all duration-200 hover:shadow-lg hover:shadow-black/5 hover:-translate-y-0.5 group"
                style={{
                  borderColor: 'var(--border-color)',
                  background: 'var(--bg-card)',
                }}
              >
                {/* Top Row: Method Badge + Endpoint + Status + Env */}
                <div className="px-4 py-3 flex flex-wrap items-center gap-3">
                  {/* Row number */}
                  <span className="text-[11px] font-mono t-muted w-6 text-right flex-shrink-0">
                    {(currentPage - 1) * itemsPerPage + idx + 1}
                  </span>

                  {/* Method badge */}
                  <span
                    className="inline-flex items-center justify-center rounded-lg px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider flex-shrink-0"
                    style={{
                      background: mc.bg,
                      color: mc.text,
                      border: `1px solid ${mc.border}`,
                      minWidth: '64px',
                      textAlign: 'center',
                    }}
                  >
                    {mock.method}
                  </span>

                  {/* Endpoint - the main attraction */}
                  <div className="flex-1 min-w-0 break-all">
                    {searchQuery.trim() ? (
                      <span className="font-mono text-[13px] t-primary break-all">
                        {highlight(mock.endpoint, searchQuery)}
                      </span>
                    ) : (
                      formatEndpoint(mock.endpoint)
                    )}
                  </div>

                  {/* Status code */}
                  <span
                    className="inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-bold flex-shrink-0"
                    style={{
                      background: mock.statusCode >= 200 && mock.statusCode < 300
                        ? 'rgba(34,197,94,0.12)'
                        : mock.statusCode >= 400
                        ? 'rgba(239,68,68,0.12)'
                        : 'rgba(245,158,11,0.12)',
                      color: mock.statusCode >= 200 && mock.statusCode < 300
                        ? '#22c55e'
                        : mock.statusCode >= 400
                        ? '#ef4444'
                        : '#f59e0b',
                    }}
                  >
                    {mock.statusCode}
                  </span>

                  {/* Environment badge */}
                  <span
                    className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase flex-shrink-0"
                    style={{ background: eb.bg, color: eb.text }}
                  >
                    {mock.environment}
                  </span>
                </div>

                {/* Bottom Row: Meta info + Data pills + Actions */}
                <div
                  className="px-4 py-2.5 flex flex-wrap items-center gap-2 border-t"
                  style={{ borderColor: 'var(--border-color)', background: 'rgba(0,0,0,0.02)' }}
                >
                  {/* Description / Test Case chip */}
                  {mock.testCase && (
                    <span className="text-[10px] font-medium bg-violet-500/10 text-violet-400 rounded-full px-2.5 py-0.5">
                      {mock.testCase.length > 30 ? mock.testCase.slice(0, 30) + '…' : mock.testCase}
                    </span>
                  )}
                  {mock.description && (
                    <span className="text-[10px] t-muted italic max-w-[200px] truncate" title={mock.description}>
                      {mock.description}
                    </span>
                  )}

                  {/* Data pills */}
                  <div className="flex flex-wrap gap-1.5 sm:ml-auto mt-2 sm:mt-0">
                    {onViewQueryParams && (
                      <button
                        type="button"
                        className={`text-[10px] font-semibold rounded-full px-2.5 py-0.5 transition-colors ${
                          hasQuery
                            ? 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20'
                            : 'bg-slate-500/10 t-muted opacity-50'
                        }`}
                        onClick={() => onViewQueryParams(mock)}
                        disabled={!hasQuery}
                      >
                        Query {hasQuery ? `(${Object.keys(mock.queryParams!).length})` : ''}
                      </button>
                    )}
                    {onViewHeaders && (
                      <button
                        type="button"
                        className={`text-[10px] font-semibold rounded-full px-2.5 py-0.5 transition-colors ${
                          hasHeaders
                            ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                            : 'bg-slate-500/10 t-muted opacity-50'
                        }`}
                        onClick={() => onViewHeaders(mock)}
                        disabled={!hasHeaders}
                      >
                        Headers {hasHeaders ? `(${Object.keys(mock.headers!).length})` : ''}
                      </button>
                    )}
                    {onViewBody && (
                      <button
                        type="button"
                        className={`text-[10px] font-semibold rounded-full px-2.5 py-0.5 transition-colors ${
                          hasBody
                            ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
                            : 'bg-slate-500/10 t-muted opacity-50'
                        }`}
                        onClick={() => onViewBody(mock)}
                        disabled={!hasBody}
                      >
                        Body
                      </button>
                    )}
                    {onViewResponse && (
                      <button
                        type="button"
                        className="text-[10px] font-semibold rounded-full px-2.5 py-0.5 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition-colors"
                        onClick={() => onViewResponse(mock)}
                      >
                        Response
                      </button>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-2 sm:mt-0 sm:ml-2 sm:border-l sm:pl-2" style={{ borderColor: 'var(--border-color)' }}>
                    {isTrash ? (
                      <>
                        {onRecover && (
                          <button
                            className="text-[11px] font-semibold text-emerald-500 hover:text-emerald-400 transition-colors px-2 py-1 rounded-lg hover:bg-emerald-500/10"
                            onClick={() => onRecover(mock.id)}
                          >
                            ↩ Recover
                          </button>
                        )}
                        {onPermanentDelete && (
                          <button
                            className="text-[11px] font-semibold text-red-500 hover:text-red-400 transition-colors px-2 py-1 rounded-lg hover:bg-red-500/10"
                            onClick={() => onPermanentDelete(mock.id)}
                          >
                            ✕ Permanent Delete
                          </button>
                        )}
                      </>
                    ) : (
                      <>
                        {onTestApi && (
                          <button
                            type="button"
                            className="text-[11px] font-semibold text-emerald-500 hover:text-emerald-400 transition-colors px-2 py-1 rounded-lg hover:bg-emerald-500/10"
                            onClick={() => onTestApi(mock)}
                          >
                            ▶ Test
                          </button>
                        )}
                        <button
                          className="text-[11px] font-semibold text-blue-500 hover:text-blue-400 transition-colors px-2 py-1 rounded-lg hover:bg-blue-500/10"
                          onClick={() => onViewCurl(mock)}
                        >
                          Curl
                        </button>
                        <button
                          className="text-[11px] font-semibold text-amber-500 hover:text-amber-400 transition-colors px-2 py-1 rounded-lg hover:bg-amber-500/10"
                          onClick={() => onEdit(mock)}
                        >
                          Edit
                        </button>
                        <button
                          className="text-[11px] font-semibold t-muted hover:text-white transition-colors px-2 py-1 rounded-lg hover:bg-white/5"
                          onClick={() => onClone(mock)}
                        >
                          Clone
                        </button>
                        <button
                          className="text-[11px] font-semibold text-red-500 hover:text-red-400 transition-colors px-2 py-1 rounded-lg hover:bg-red-500/10"
                          onClick={() => onDelete(mock.id)}
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>

                  {/* Updated info */}
                  {mock.updatedAt && (
                    <span className="text-[9px] t-muted ml-1 whitespace-nowrap">
                      {new Date(mock.updatedAt).toLocaleDateString()} {mock.updatedBy ? `• ${mock.updatedBy}` : ''}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {!empty && totalPages > 1 && (
          <div className="border-t px-5 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 mt-4" style={{borderColor:'var(--border-color)'}}>
            <div className="text-xs t-muted text-center sm:text-left">
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
