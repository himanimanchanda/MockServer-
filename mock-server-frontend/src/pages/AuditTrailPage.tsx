import React from 'react'
import Toast, { ToastKind } from '../components/Toast'
import { listAuditLogs } from '../api/client'
import type { AuditLogDto, AuditAction } from '../types'
import ViewJsonModal from '../components/ViewJsonModal'

function formatTs(iso: string) {
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

function actionBadge(action: AuditAction) {
  const styles: Record<string, { bg: string; text: string }> = {
    CREATE: { bg: 'rgba(34,197,94,0.15)', text: '#22c55e' },
    UPDATE: { bg: 'rgba(59,130,246,0.15)', text: '#3b82f6' },
    DELETE: { bg: 'rgba(245,158,11,0.15)', text: '#f59e0b' },
    RECOVER: { bg: 'rgba(168,85,247,0.15)', text: '#a855f7' },
    PERMANENT_DELETE: { bg: 'rgba(239,68,68,0.15)', text: '#ef4444' },
  }
  const s = styles[action] || styles.CREATE
  return s
}

export default function AuditTrailPage() {
  const [rows, setRows] = React.useState<AuditLogDto[]>([])
  const [loading, setLoading] = React.useState(true)
  const [page, setPage] = React.useState(0)
  const [totalPages, setTotalPages] = React.useState(1)
  const [error, setError] = React.useState<{ kind: ToastKind; message: string } | null>(null)
  const [viewModal, setViewModal] = React.useState<{ title: string; value: any } | null>(null)
  const size = 20

  async function load(p: number) {
    setLoading(true)
    setError(null)
    try {
      const res = await listAuditLogs(p, size)
      setRows(res.content ?? [])
      setTotalPages(Math.max(1, res.totalPages ?? 1))
      setPage(res.number ?? p)
    } catch (e: any) {
      setError({ kind: 'error', message: e?.response?.data?.message || e?.message || 'Failed to load audit trail' })
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    load(0)
  }, [])

  function tryParseJson(str: string | null | undefined): any {
    if (!str) return null
    try { return JSON.parse(str) } catch { return str }
  }

  return (
    <div className="space-y-5 animate-slide-up">
      {error && <Toast kind={error.kind} message={error.message} onClose={() => setError(null)} />}
      <div>
        <h1 className="text-2xl font-bold t-heading">Audit Trail</h1>
        <p className="mt-1 text-sm t-secondary">
          CREATE / UPDATE / DELETE / RECOVER / PERMANENTLY DELETED events for mocks and projects.
        </p>
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        <div className="border-b px-5 py-4 flex items-center justify-between gap-3" style={{ borderColor: 'var(--border-color)' }}>
          <div className="text-sm font-bold t-heading">Entity changes</div>
          <button className="btn-glass rounded-xl px-4 py-2 text-xs font-medium" onClick={() => load(page)} disabled={loading}>
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>

        <div className="p-3 sm:p-5 space-y-3">
          {rows.length === 0 && !loading ? (
            <div className="px-4 py-8 text-center text-xs t-muted">
              No audit entries yet.
            </div>
          ) : (
            rows.map((r) => {
              const ab = actionBadge(r.action)
              return (
                <div
                  key={r.id}
                  className="rounded-xl border transition-all duration-200 hover:shadow-md"
                  style={{
                    borderColor: 'var(--border-color)',
                    background: 'var(--bg-card)',
                  }}
                >
                  {/* Header row */}
                  <div className="px-4 py-3 flex flex-wrap items-center gap-3">
                    {/* Action badge */}
                    <span
                      className="inline-flex items-center rounded-lg px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider"
                      style={{ background: ab.bg, color: ab.text }}
                    >
                      {r.action === 'PERMANENT_DELETE' ? 'PERMANENTLY DELETED' : r.action}
                    </span>

                    {/* Entity type */}
                    <span className="text-xs font-semibold t-heading">{r.entityType}</span>

                    {/* For MOCK → show project name, For PROJECT → show entity ID */}
                    {r.entityType === 'MOCK' && r.projectName ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-[11px] bg-indigo-500/15 text-indigo-400 rounded-full px-2.5 py-0.5">
                        📁 {r.projectName}
                      </span>
                    ) : (
                      <span className="font-mono text-[11px] t-secondary break-all">{r.entityId}</span>
                    )}

                    {/* Timestamp */}
                    <span className="text-[10px] t-muted ml-auto whitespace-nowrap">
                      🕐 {formatTs(r.performedAt)}
                    </span>

                    {/* Actor */}
                    {r.actorOlmId && (
                      <span className="text-[10px] font-medium bg-slate-500/10 rounded-full px-2 py-0.5 t-secondary">
                        👤 {r.actorOlmId}
                      </span>
                    )}
                  </div>

                  {/* Detail row: path, summary, request/response bodies */}
                  <div
                    className="px-4 py-2.5 border-t flex flex-wrap items-center gap-2"
                    style={{ borderColor: 'var(--border-color)', background: 'rgba(0,0,0,0.02)' }}
                  >
                    {/* Path */}
                    {r.path && (
                      <span className="font-mono text-[11px] bg-indigo-500/10 text-indigo-400 rounded-full px-2.5 py-0.5">
                        📍 {r.path}
                      </span>
                    )}

                    {/* Summary */}
                    {r.summary && (
                      <span className="text-[11px] t-muted italic max-w-[400px] truncate" title={r.summary}>
                        {r.summary}
                      </span>
                    )}

                    {/* Request / Response body buttons */}
                    <div className="flex gap-1.5 ml-auto">
                      {r.requestBody && (
                        <button
                          className="text-[10px] font-semibold rounded-full px-2.5 py-0.5 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors"
                          onClick={() => setViewModal({
                            title: `Request Body — ${r.action} ${r.entityType} (${r.entityId.slice(0, 8)}…)`,
                            value: tryParseJson(r.requestBody)
                          })}
                        >
                          📄 Request Body
                        </button>
                      )}
                      {r.responseBody && (
                        <button
                          className="text-[10px] font-semibold rounded-full px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                          onClick={() => setViewModal({
                            title: `Response Body — ${r.action} ${r.entityType} (${r.entityId.slice(0, 8)}…)`,
                            value: tryParseJson(r.responseBody)
                          })}
                        >
                          📦 Response Body
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        <div className="flex items-center justify-between px-5 py-3 border-t text-xs t-muted" style={{ borderColor: 'var(--border-color)' }}>
          <span>
            Page {page + 1} / {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              className="btn-glass rounded-lg px-3 py-1.5 disabled:opacity-40"
              disabled={page <= 0 || loading}
              onClick={() => load(page - 1)}
            >
              Prev
            </button>
            <button
              className="btn-glass rounded-lg px-3 py-1.5 disabled:opacity-40"
              disabled={page + 1 >= totalPages || loading}
              onClick={() => load(page + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {viewModal && <ViewJsonModal title={viewModal.title} value={viewModal.value} onClose={() => setViewModal(null)} />}
    </div>
  )
}
