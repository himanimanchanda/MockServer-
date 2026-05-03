import React from 'react'
import Toast, { ToastKind } from '../components/Toast'
import { listAuditLogs } from '../api/client'
import type { AuditLogDto } from '../types'

function formatTs(iso: string) {
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

export default function AuditTrailPage() {
  const [rows, setRows] = React.useState<AuditLogDto[]>([])
  const [loading, setLoading] = React.useState(true)
  const [page, setPage] = React.useState(0)
  const [totalPages, setTotalPages] = React.useState(1)
  const [error, setError] = React.useState<{ kind: ToastKind; message: string } | null>(null)
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

  return (
    <div className="space-y-5 animate-slide-up">
      {error && <Toast kind={error.kind} message={error.message} onClose={() => setError(null)} />}
      <div>
        <h1 className="text-2xl font-bold t-heading">Audit Trail</h1>
        <p className="mt-1 text-sm t-secondary">
          CREATE / UPDATE / DELETE / RECOVER events for mocks and projects (PostgreSQL table <code className="text-xs">entity_audit_logs</code>).
        </p>
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        <div className="border-b px-5 py-4 flex items-center justify-between gap-3" style={{ borderColor: 'var(--border-color)' }}>
          <div className="text-sm font-bold t-heading">Entity changes</div>
          <button className="btn-glass rounded-xl px-4 py-2 text-xs font-medium" onClick={() => load(page)} disabled={loading}>
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase t-label">When</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase t-label">Action</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase t-label">Type</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase t-label">Entity id</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase t-label">Actor</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase t-label">Summary</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && !loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-xs t-muted">
                    No audit entries yet.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="border-b hover:bg-[var(--bg-card-hover)] transition-colors" style={{ borderColor: 'var(--border-color)' }}>
                    <td className="px-4 py-3 text-xs whitespace-nowrap t-secondary">{formatTs(r.performedAt)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="inline-block rounded-md px-2 py-1 text-[11px] font-bold uppercase bg-slate-500/20">{r.action}</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{r.entityType}</td>
                    <td className="px-4 py-3 font-mono text-[11px] break-all max-w-[120px] sm:max-w-[220px]">{r.entityId}</td>
                    <td className="px-4 py-3 text-xs">{r.actorOlmId ?? '—'}</td>
                    <td className="px-4 py-3 text-xs t-muted max-w-[360px] break-words">{r.summary ?? '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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
    </div>
  )
}
