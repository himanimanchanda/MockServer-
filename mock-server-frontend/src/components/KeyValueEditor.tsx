import React from 'react'
import type { KVRow } from '../types'

function toRows(map?: Record<string, string>): KVRow[] {
  if (!map) return []
  return Object.entries(map).map(([key, value]) => {
    // Detect dynamic values (prefixed with $)
    const isDynamic = value.startsWith('$')
    return {
      key,
      value: isDynamic ? value.substring(1) : value,
      dynamic: isDynamic,
    }
  })
}

export default function KeyValueEditor({
  title,
  value,
  onChange,
  placeholderKey = 'Key',
  placeholderValue = 'Value',
  showDynamic = false,
}: {
  title: string
  value?: Record<string, string>
  onChange: (next?: Record<string, string>, list?: KVRow[]) => void
  placeholderKey?: string
  placeholderValue?: string
  showDynamic?: boolean
}) {
  const [rows, setRows] = React.useState<KVRow[]>(toRows(value))

  React.useEffect(() => {
    setRows(toRows(value))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(value ?? {})])

  function emitChange(nextRows: KVRow[]) {
    const filtered = nextRows.filter(r => r.key.trim().length > 0)
    if (filtered.length === 0) {
      onChange(undefined, [])
      return
    }
    const map: Record<string, string> = {}
    for (const r of filtered) {
      map[r.key.trim()] = r.dynamic ? `$${r.value}` : r.value
    }
    onChange(map, filtered)
  }

  function updateRow(idx: number, patch: Partial<KVRow>) {
    setRows(prev => {
      const next = prev.map((r, i) => (i === idx ? { ...r, ...patch } : r))
      emitChange(next)
      return next
    })
  }

  function addRow() {
    const next = [...rows, { key: '', value: '', dynamic: false }]
    setRows(next)
  }

  function removeRow(idx: number) {
    const next = rows.filter((_, i) => i !== idx)
    setRows(next)
    emitChange(next)
  }

  return (
    <div className="glass rounded-xl overflow-hidden">
      <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border-color)' }}>
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</div>

          <button
            type="button"
            className="btn-gradient rounded-lg px-3 py-1.5 text-[11px] font-semibold"
            onClick={addRow}
          >
            + Add Row
          </button>
        </div>
        <div className="mt-2 grid gap-2 text-[10px] font-bold uppercase tracking-widest" style={{
          color: 'var(--text-muted)',
          gridTemplateColumns: showDynamic ? '1fr 1fr 72px 56px' : '1fr 1fr 56px',
        }}>
          <div>Key</div>
          <div>Value</div>
          {showDynamic && <div className="text-center">Type</div>}
          <div className="text-right">Action</div>
        </div>
      </div>

      <div className="p-4">
        {rows.length === 0 ? (
          <div className="rounded-xl border border-dashed px-4 py-6 text-center text-xs"
            style={{ borderColor: 'var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-muted)' }}
          >
            No rows yet. Click <span className="font-semibold text-accent-light">Add Row</span> to create one.
          </div>
        ) : (
          <div className="space-y-2">
            {rows.map((r, idx) => (
              <div
                key={idx}
                className={`grid gap-2 items-center rounded-xl px-1 py-0.5 transition-all duration-200 ${
                  r.dynamic ? 'kv-row-dynamic' : ''
                }`}
                style={{
                  gridTemplateColumns: showDynamic ? '1fr 1fr 72px 56px' : '1fr 1fr 56px',
                }}
              >
                <input
                  className="rounded-xl input-dark px-3 py-2 text-sm"
                  placeholder={placeholderKey}
                  value={r.key}
                  onChange={e => updateRow(idx, { key: e.target.value })}
                />
                <div className="flex items-center rounded-xl input-dark px-3 py-2">
                  {r.dynamic && <span className="mr-1 text-accent-light text-sm font-bold">$</span>}
                  <input
                    className="outline-none w-full text-sm bg-transparent"
                    style={{ color: 'var(--text-primary)' }}
                    placeholder={placeholderValue}
                    value={r.value}
                    onChange={e => updateRow(idx, { value: e.target.value })}
                  />
                </div>
                {showDynamic && (
                  <button
                    type="button"
                    onClick={() => updateRow(idx, { dynamic: !r.dynamic })}
                    className={`rounded-lg px-2 py-1.5 text-[10px] font-bold uppercase tracking-wide transition-all duration-200 text-center ${
                      r.dynamic
                        ? 'bg-accent/20 text-accent-light border border-accent/30'
                        : 'btn-glass'
                    }`}
                    title={r.dynamic ? 'Dynamic — wildcard matching' : 'Static — strict matching'}
                  >
                    {r.dynamic ? '⚡ Dyn' : 'Static'}
                  </button>
                )}
                <div className="text-right">
                  <button
                    type="button"
                    className="btn-danger rounded-lg px-2 py-1.5 text-[10px] font-medium"
                    onClick={() => removeRow(idx)}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {rows.length > 0 && (
          <div className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
            {showDynamic ? (
              <>
                <span className="text-accent-light font-semibold">⚡ Dynamic</span> = wildcard matching · <span className="font-semibold">Static</span> = strict matching
              </>
            ) : (
              'Changes are saved as you type.'
            )}
          </div>
        )}
      </div>
    </div>
  )
}
