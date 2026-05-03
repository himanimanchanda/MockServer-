import React from 'react'
import KeyValueEditor from './KeyValueEditor'

export default function QueryTable({
  value,
  onChange,
}: {
  value: Record<string, string> | undefined
  onChange: (next: Record<string, string> | undefined) => void
}) {
  return (
    <div className="glass rounded-xl overflow-hidden">
      <div className="border-b px-4 py-2.5 text-xs font-bold t-muted uppercase tracking-wider" style={{borderColor:'var(--border-color)'}}>Query Parameters</div>
      <div className="p-4">
        <KeyValueEditor
          title="Request Query Params (optional)"
          value={value}
          onChange={onChange}
          placeholderKey="q"
          placeholderValue="value"
        />
      </div>
    </div>
  )
}
