import React from 'react'
import type { Environment } from '../types'

export default function EnvironmentSelect({
  value,
  onChange
}: {
  value: Environment
  onChange: (next: Environment) => void
}) {
  const envs: Environment[] = ['DEV', 'QA', 'PROD']
  return (
    <select
      className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
      value={value}
      onChange={(e) => onChange(e.target.value as Environment)}
    >
      {envs.map((env) => (
        <option key={env} value={env}>
          {env}
        </option>
      ))}
    </select>
  )
}

