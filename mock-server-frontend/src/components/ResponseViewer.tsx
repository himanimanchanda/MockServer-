import React from 'react'

function statusColor(status: number) {
  if (status >= 200 && status < 300) return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25'
  if (status >= 300 && status < 400) return 'bg-blue-500/15 text-blue-300 border-blue-500/25'
  if (status >= 400 && status < 500) return 'bg-amber-500/15 text-amber-300 border-amber-500/25'
  return 'bg-red-500/15 text-red-300 border-red-500/25'
}

export default function ResponseViewer({
  status,
  timeMs,
  headers,
  body,
}: {
  status: number
  timeMs: number
  headers: Record<string, any>
  body: any
}) {
  return (
    <div className="space-y-3 animate-slide-up">
      <div className="flex items-center gap-4 text-xs font-medium">
        <span className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-bold ${statusColor(status)}`}>
          {status}
        </span>
        <span className="t-secondary">
          Response Time: <span className="font-mono t-heading">{Math.round(timeMs)}ms</span>
        </span>
      </div>
      <div className="glass rounded-xl overflow-hidden">
        <div className="border-b px-4 py-2.5 text-xs font-bold t-muted uppercase tracking-wider" style={{borderColor:'var(--border-color)'}}>Response Headers</div>
        <div className="max-h-40 overflow-auto p-4">
          {Object.keys(headers || {}).length === 0 ? (
            <div className="text-xs t-muted">No headers.</div>
          ) : (
            <table className="min-w-full text-xs">
              <tbody>
                {Object.entries(headers).map(([k, v]) => (
                  <tr key={k} className="border-b last:border-0" style={{borderColor:'var(--border-color)'}}>
                    <td className="py-1.5 pr-4 font-mono t-secondary">{k}</td>
                    <td className="py-1.5 font-mono t-primary">
                      {Array.isArray(v) ? v.join(', ') : String(v)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      <pre className="max-h-80 overflow-auto rounded-xl p-4 text-xs text-emerald-400 font-mono" style={{background:'var(--code-bg)', border:'1px solid var(--border-color)'}}>
        {typeof body === 'string' ? body : JSON.stringify(body, null, 2)}
      </pre>
    </div>
  )
}
