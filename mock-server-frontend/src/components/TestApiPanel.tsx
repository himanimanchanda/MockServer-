import React from 'react'
import type { Environment, HttpMethod } from '../types'
import { hitMockEndpoint } from '../api/client'
import KeyValueEditor from './KeyValueEditor'
import JsonEditor from './JsonEditor'
import HeaderTable from './HeaderTable'
import QueryTable from './QueryTable'
import ResponseViewer from './ResponseViewer'

export default function TestApiPanel({
  defaultEndpoint,
}: {
  defaultEndpoint?: string
}) {
  const [endpoint, setEndpoint] = React.useState(defaultEndpoint ?? '')
  const [method, setMethod] = React.useState<HttpMethod>('GET')
  const [environment, setEnvironment] = React.useState<Environment>('DEV')
  const [queryParams, setQueryParams] = React.useState<Record<string, string> | undefined>(undefined)
  const [headers, setHeaders] = React.useState<Record<string, string> | undefined>(undefined)
  const [requestBody, setRequestBody] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [result, setResult] = React.useState<{
    status: number
    body: any
    headers: Record<string, any>
    timeMs: number
  } | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (defaultEndpoint != null && defaultEndpoint.trim().length > 0) {
      setEndpoint(defaultEndpoint)
    }
  }, [defaultEndpoint])

  async function hit() {
    setError(null)
    setLoading(true)
    try {
      const normalized = endpoint.trim()
      if (!normalized) {
        setError('Enter an endpoint path (e.g. /users/123)')
        return
      }

      const body = requestBody.trim() ? requestBody : undefined

      const start = typeof performance !== 'undefined' ? performance.now() : Date.now()
      const res = await hitMockEndpoint({
        endpoint: normalized,
        method,
        environment,
        queryParams,
        headers,
        requestBody: body,
      })
      const end = typeof performance !== 'undefined' ? performance.now() : Date.now()
      setResult({ status: res.status, body: res.data, headers: res.headers, timeMs: Math.max(0, end - start) })
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="glass rounded-2xl overflow-hidden">
      <div className="border-b px-5 py-4" style={{borderColor:'var(--border-color)'}}>
        <div className="text-sm font-bold t-heading">Test API</div>
        <div className="mt-1 text-xs t-muted">
          Hit your mock engine using a real path & method.
        </div>
      </div>

      <div className="space-y-4 p-5">
        <HeaderTable
          endpoint={endpoint}
          onEndpointChange={setEndpoint}
          method={method}
          onMethodChange={setMethod}
          environment={environment}
          onEnvironmentChange={setEnvironment}
        />

        <div className="flex justify-end">
          <button
            type="button"
            className="btn-gradient rounded-xl px-6 py-2.5 text-sm font-semibold disabled:opacity-50"
            onClick={hit}
            disabled={loading}
          >
            {loading ? 'Sending...' : 'Hit API'}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <QueryTable value={queryParams} onChange={setQueryParams} />
          </div>
          <div>
            <KeyValueEditor
              title="Request Headers (optional)"
              value={headers}
              onChange={setHeaders}
              placeholderKey="Authorization"
              placeholderValue="Bearer token"
            />
          </div>
        </div>

        <div>
          <JsonEditor label="Request Body (optional JSON)" value={requestBody} onChange={setRequestBody} />
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {result && (
          <ResponseViewer status={result.status} timeMs={result.timeMs} headers={result.headers} body={result.body} />
        )}
      </div>
    </div>
  )
}
