import React from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

export default function ShellLayout() {
  // on mobile, default closed. on desktop, default open.
  const [isOpen, setIsOpen] = React.useState(() => window.innerWidth > 768)

  return (
    <div className="flex h-screen overflow-hidden bg-mesh" style={{ background: 'var(--bg-primary)' }}>

      {/* MOBILE HEADER (only visible on sm) */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 z-30 flex items-center justify-between px-4" style={{ background: 'var(--bg-primary)', borderBottom: '1px solid var(--border-color)' }}>
        <div className="text-sm font-bold gradient-text tracking-tight">Mock Server</div>
        <button onClick={() => setIsOpen(true)} className="p-2 text-accent-light">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
      </div>

      {/* OVERLAY FOR MOBILE */}
      {isOpen && (
        <div 
          className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <div className={`fixed md:relative z-50 h-full transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <Sidebar
          isOpen={isOpen}
          toggle={() => setIsOpen(!isOpen)}
        />
      </div>

      {/* MAIN CONTENT */}
      <div className="flex flex-1 flex-col pt-16 md:pt-0">
        <main className="flex-1 overflow-auto">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}