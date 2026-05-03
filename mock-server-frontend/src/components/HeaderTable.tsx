import React from 'react'
import type { Environment, HttpMethod } from '../types'

export default function HeaderTable({
  endpoint,
  onEndpointChange,
  method,
  onMethodChange,
  environment,
  onEnvironmentChange,
}: {
  endpoint: string
  onEndpointChange: (v: string) => void
  method: HttpMethod
  onMethodChange: (v: HttpMethod) => void
  environment: Environment
  onEnvironmentChange: (v: Environment) => void
}) {
  return (
    <div className="grid grid-cols-12 gap-3">
      <div className="col-span-12 lg:col-span-8">
        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">Endpoint</label>
        <input
          className="w-full rounded-xl input-dark px-4 py-2.5 text-sm font-mono"
          value={endpoint}
          onChange={(e) => onEndpointChange(e.target.value)}
          placeholder="/users/123"
        />
      </div>
      <div className="col-span-6 lg:col-span-2">
        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">Method</label>
        <select
          className="w-full rounded-xl input-dark px-3 py-2.5 text-sm"
          value={method}
          onChange={(e) => onMethodChange(e.target.value as HttpMethod)}
        >
          {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>
      <div className="col-span-6 lg:col-span-2">
        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">Env</label>
        <select
          className="w-full rounded-xl input-dark px-3 py-2.5 text-sm"
          value={environment}
          onChange={(e) => onEnvironmentChange(e.target.value as Environment)}
        >
          {['DEV', 'QA', 'PROD'].map((env) => (
            <option key={env} value={env}>
              {env}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
