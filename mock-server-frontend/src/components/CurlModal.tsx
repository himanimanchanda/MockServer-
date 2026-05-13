import React from 'react'
import type { Environment, HttpMethod, MockDto } from '../types'
import Toast from './Toast'
import { getAuthToken } from '../api/client'
import { API_BASE_URL } from '../utils/curl'

function extractPathVars(endpointTemplate: string): string[] {
  const vars = new Set<string>()
  const re = /\{\s*([^}]+)\s*\}/g
  let m: RegExpExecArray | null
  while ((m = re.exec(endpointTemplate)) !== null) {
    const v = m[1]?.trim()
    if (v) vars.add(v)
  }
  return Array.from(vars)
}

function escapeForSingleQuotes(s: string) {
  // Shell-safe-ish escaping for simple usage.
  return s.replace(/'/g, `'\\''`)
}

export default function CurlModal({
  mock,
  onClose,
}: {
  mock: MockDto
  onClose: () => void
}) {
  const [pathVars, setPathVars] = React.useState<Record<string, string>>(() => {
    const vars = extractPathVars(mock.endpoint)
    const init: Record<string, string> = {}
    vars.forEach((v) => (init[v] = ''))
    return init
  })
  const [toast, setToast] = React.useState<{ kind: 'success' | 'error'; message: string } | null>(null)

  const pathVariables = React.useMemo(() => extractPathVars(mock.endpoint), [mock.endpoint])

  const curlEnabled = React.useMemo(() => {
    return pathVariables.every((v) => (pathVars[v] ?? '').trim().length > 0)
  }, [pathVars, pathVariables])

  const resolvedPath = React.useMemo(() => {
    let out = mock.endpoint
    for (const v of pathVariables) {
      const value = (pathVars[v] ?? '').trim()
      out = out.replace(new RegExp(`\\{\\s*${v}\\s*\\}`, 'g'), value)
    }
    return out.startsWith('/') ? out : `/${out}`
  }, [mock.endpoint, pathVariables, pathVars])

  const urlWithQuery = React.useMemo(() => {
    const url = new URL(`${API_BASE_URL}${resolvedPath}`)
    const q = mock.queryParams ?? {}
    for (const [k, v] of Object.entries(q)) {
      url.searchParams.set(k, v)
    }
    return url.toString()
  }, [resolvedPath, mock.queryParams])

  const curl = React.useMemo(() => {
    const method = mock.method
    const ct = mock.contentType ?? 'application/json'
    const parts: string[] = [`curl -X ${method} "${urlWithQuery}"`]
    const token = getAuthToken()
    if (token) {
      parts.push(`-H "Authorization: Bearer ${token}"`)
    } else {
      parts.push(`-H "Authorization: Bearer <JWT>"`)
    }
    parts.push(`-H "ldev: true"`)
    parts.push(`-H "X-Environment: ${mock.environment}"`)

    const headers = mock.headers ?? {}
    for (const [k, v] of Object.entries(headers)) {
      if (!k) continue
      parts.push(`-H "${k}: ${v}"`)
    }

    const bodyRaw = mock.requestBody ? String(mock.requestBody) : ''
    if (bodyRaw.trim().length > 0 && (method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE')) {
      if (ct.includes('multipart/form-data')) {
        // form-data: parse JSON body into -F flags
        try {
          const parsed = JSON.parse(bodyRaw.trim())
          Object.entries(parsed).forEach(([key, value]) => {
            parts.push(`-F '${key}=${String(value)}'`)
          })
        } catch {
          parts.push(`-F '${escapeForSingleQuotes(bodyRaw.trim())}'`)
        }
      } else if (ct.includes('x-www-form-urlencoded')) {
        // URL-encoded
        parts.push(`-H "Content-Type: application/x-www-form-urlencoded"`)
        try {
          const parsed = JSON.parse(bodyRaw.trim())
          Object.entries(parsed).forEach(([key, value]) => {
            parts.push(`--data-urlencode '${key}=${String(value)}'`)
          })
        } catch {
          parts.push(`--data-urlencode '${escapeForSingleQuotes(bodyRaw.trim())}'`)
        }
      } else {
        // JSON (default)
        const escaped = escapeForSingleQuotes(bodyRaw.trim())
        parts.push(`-H "Content-Type: ${ct}"`)
        parts.push(`-d '${escaped}'`)
      }
    }

    return parts.join(' \\\n ')
  }, [mock.method, mock.environment, mock.headers, mock.requestBody, mock.contentType, urlWithQuery])

  async function copy() {
    try {
      await navigator.clipboard.writeText(curl)
      setToast({ kind: 'success', message: 'Curl copied to clipboard.' })
    } catch {
      setToast({ kind: 'error', message: 'Copy failed (clipboard permissions).' })
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl glass-strong rounded-2xl shadow-2xl animate-scale-in">
        <div className="flex items-center justify-between border-b px-5 py-4" style={{borderColor:'var(--border-color)'}}>
          <div>
            <div className="text-sm font-bold t-heading">View Curl</div>
            <div className="text-xs t-muted">Fill path parameters, then copy the generated request.</div>
          </div>
          <button
            type="button"
            className="btn-glass rounded-lg px-3 py-1.5 text-xs font-medium"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div className="p-5 space-y-4">
          {pathVariables.length > 0 && (
            <div className="rounded-xl border p-4" style={{borderColor:'var(--border-color)', background:'var(--bg-card)'}}>
              <div className="text-xs font-bold t-muted uppercase tracking-wider mb-3">Path Parameters</div>
              <div className="grid grid-cols-12 gap-3">
                {pathVariables.map((v) => (
                  <div className="col-span-6" key={v}>
                    <label className="mb-1.5 block text-xs font-medium t-secondary">{v}</label>
                    <input
                      className="w-full rounded-xl input-dark px-4 py-2.5 text-sm"
                      value={pathVars[v] ?? ''}
                      onChange={(e) => setPathVars((prev) => ({ ...prev, [v]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
              {!curlEnabled && <div className="mt-3 text-xs text-red-400">Enter all path parameters to generate curl.</div>}
            </div>
          )}

          {toast && <Toast kind={toast.kind} message={toast.message} onClose={() => setToast(null)} />}

          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider t-label">Generated Command</label>
            <textarea
              className="h-44 w-full rounded-xl font-mono text-xs text-emerald-400 p-4 outline-none focus:border-accent/50"
              style={{background:'var(--code-bg)', border:'1px solid var(--border-color)'}}
              readOnly
              value={curlEnabled ? curl : 'Enter path parameters to generate the curl command.'}
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              className="btn-gradient rounded-xl px-5 py-2.5 text-sm font-semibold disabled:opacity-50"
              onClick={copy}
              disabled={!curlEnabled}
            >
              Copy Curl
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
