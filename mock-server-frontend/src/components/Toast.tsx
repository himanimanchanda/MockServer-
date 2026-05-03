import React from 'react'

export type ToastKind = 'success' | 'error' | 'info'

const stylesByKind: Record<ToastKind, { bg: string; text: string; icon: string; iconColor: string }> = {
  success: {
    bg: 'bg-emerald-500',
    text: 'text-white',
    icon: '✓',
    iconColor: 'text-white',
  },
  error: {
    bg: 'bg-red-500',
    text: 'text-white',
    icon: '✕',
    iconColor: 'text-white',
  },
  info: {
    bg: 'bg-blue-500',
    text: 'text-white',
    icon: 'ℹ',
    iconColor: 'text-white',
  },
}

export default function Toast({
  kind,
  message,
  onClose
}: {
  kind: ToastKind
  message: string
  onClose: () => void
}) {
  const styles = stylesByKind[kind]

  return (
    <div
      className={`fixed top-5 right-5 z-[100] min-w-[320px] rounded-xl ${styles.bg} ${styles.text} px-4 py-3.5 text-sm animate-slide-in-right shadow-2xl`}
      role="alert"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className={`text-base font-bold ${styles.iconColor} bg-white/20 rounded-full w-5 h-5 flex items-center justify-center leading-none pb-0.5`}>{styles.icon}</span>
          <span className={`font-bold ${styles.text}`}>{kind.toUpperCase()}</span>
        </div>
        <button
          className="text-white/60 hover:text-white transition-colors text-xl leading-none"
          onClick={onClose}
          aria-label="Close toast"
        >
          ×
        </button>
      </div>
      <div className={`mt-1 pl-8 font-medium text-white/90`}>{message}</div>
    </div>
  )
}
