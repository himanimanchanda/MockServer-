import React from 'react'
import { listLogs } from '../api/client'
import type { LogEntryDto } from '../types'
import Toast, { ToastKind } from '../components/Toast'

function formatTs(iso: string) {
  try {
    const d = new Date(iso)
    return d.toLocaleString()
  } catch {
    return iso
  }
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

export default function LogsPage() {
  const [logs, setLogs] = React.useState<LogEntryDto[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<{ kind: ToastKind; message: string } | null>(null)

  async function refresh() {
    setLoading(true)
    try {
      const res = await listLogs(200)
      setLogs(res)
    } catch (e: any) {
      setError({ kind: 'error', message: e?.response?.data?.message || e?.message || 'Failed to load logs' })
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    refresh()
    const t = window.setInterval(() => refresh(), 5000)
    return () => window.clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="space-y-5 animate-slide-up">
      {error && <Toast kind={error.kind} message={error.message} onClose={() => setError(null)} />}

      <div>
        <h1 className="text-2xl font-bold t-heading">Logs</h1>
        <p className="mt-1 text-sm t-secondary">Request history from the mock engine.</p>
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        <div className="border-b px-5 py-4 flex items-center justify-between gap-3" style={{borderColor:'var(--border-color)'}}>
          <div>
            <div className="flex items-center gap-3">
              <div className="text-sm font-bold t-heading">API Hit Logs</div>
              <span className="flex items-center gap-1.5 text-[10px] font-medium text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse-glow inline-block"></span>
                Live
              </span>
            </div>
            <div className="mt-1 text-xs t-muted">Most recent matches from the mock engine.</div>
          </div>
          <button
            className="btn-glass rounded-xl px-4 py-2 text-xs font-medium"
            onClick={refresh}
            disabled={loading}
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        <div className="p-5">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b" style={{borderColor:'var(--border-color)'}}>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider t-label whitespace-nowrap">Endpoint</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider t-label whitespace-nowrap">Method</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider t-label whitespace-nowrap">Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-xs t-muted">
                      No logs yet.
                    </td>
                  </tr>
                ) : (
                  logs.map((log, i) => (
                    <tr key={log.matchedMockId + log.timestamp + i} className="border-b hover:bg-[var(--bg-card-hover)] transition-colors" style={{borderColor:'var(--border-color)'}}>
                      <td className="px-4 py-3 font-mono text-sm t-primary break-all max-w-[200px] sm:max-w-[400px]">{log.endpoint}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-block rounded-md px-2.5 py-1 text-[11px] font-bold uppercase ${methodClass(log.method)}`}>
                          {log.method}
                        </span>
                      </td>
                      <td className="px-4 py-3 t-secondary text-xs whitespace-nowrap">{formatTs(log.timestamp)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs t-muted">
            <svg className="w-3.5 h-3.5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Auto-refresh every 5 seconds. Logs are persisted in PostgreSQL.
          </div>
        </div>
      </div>
    </div>
  )
}
