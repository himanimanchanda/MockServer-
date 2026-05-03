import React from 'react'
import type { HttpMethod } from '../types'

export default function HttpMethodSelect({
  value,
  onChange
}: {
  value: HttpMethod
  onChange: (next: HttpMethod) => void
}) {
  const methods: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
  return (
    <select
      className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
      value={value}
      onChange={(e) => onChange(e.target.value as HttpMethod)}
    >
      {methods.map((m) => (
        <option key={m} value={m}>
          {m}
        </option>
      ))}
    </select>
  )
}

