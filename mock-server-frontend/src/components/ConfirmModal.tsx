import React from 'react'

export default function ConfirmModal({
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  kind = 'danger',
  onConfirm,
  onCancel,
  busy = false,
}: {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  kind?: 'danger' | 'primary'
  onConfirm: () => void | Promise<void>
  onCancel: () => void
  busy?: boolean
}) {
  const confirmClass =
    kind === 'danger'
      ? 'bg-red-500/80 hover:bg-red-500 shadow-red-500/20'
      : 'btn-gradient'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md glass-strong rounded-2xl shadow-2xl animate-scale-in">
        <div className="flex items-center justify-between border-b px-5 py-4" style={{borderColor:'var(--border-color)'}}>
          <div>
            <div className="text-sm font-bold t-heading">{title}</div>
            <div className="mt-1 text-xs t-secondary whitespace-pre-line">{message}</div>
          </div>
          <button
            type="button"
            className="btn-glass rounded-lg px-3 py-1.5 text-xs font-medium"
            onClick={onCancel}
            disabled={busy}
          >
            Close
          </button>
        </div>

        <div className="p-5 flex justify-end gap-3">
          <button
            type="button"
            className="btn-glass rounded-xl px-5 py-2.5 text-sm font-medium disabled:opacity-50"
            onClick={onCancel}
            disabled={busy}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={`rounded-xl px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50 shadow-lg transition-all duration-200 ${confirmClass}`}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? 'Working...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
