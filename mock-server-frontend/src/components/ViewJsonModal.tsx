import React from 'react'

function stringify(value: any) {
  if (value == null) return ''
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

export default function ViewJsonModal({
  title,
  value,
  onClose,
}: {
  title: string
  value: any
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl glass-strong rounded-2xl shadow-2xl animate-scale-in">
        <div className="flex items-center justify-between border-b px-5 py-4" style={{borderColor:'var(--border-color)'}}>
          <div className="text-sm font-bold t-heading">{title}</div>
          <button
            type="button"
            className="btn-glass rounded-lg px-3 py-1.5 text-xs font-medium"
            onClick={onClose}
          >
            Close
          </button>
        </div>
        <div className="p-5">
          <pre className="max-h-[70vh] overflow-auto rounded-xl p-4 text-xs text-emerald-400 font-mono whitespace-pre-wrap break-words" style={{background:'var(--code-bg)', border:'1px solid var(--border-color)'}}>
            {stringify(value) || '-'}
          </pre>
        </div>
      </div>
    </div>
  )
}
