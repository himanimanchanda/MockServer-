import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { clearAuthToken, getUserInfo, listMocks } from '../api/client'
import { useProjectContext } from '../context/ProjectContext'
import { useTheme } from '../context/ThemeContext'
import type { ThemeMode } from '../context/ThemeContext'

type Props = {
  isOpen: boolean
  toggle: () => void
}

/* ── SVG Icons ──────────────────────────────────────────── */
const icons = {
  dashboard: (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1h-2z" />
    </svg>
  ),
  create: (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  ),
  routes: (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  projects: (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  ),
  testApi: (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  logs: (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  ),
  audit: (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  logout: (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  ),
  menu: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  ),
  collapse: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
    </svg>
  ),
  sun: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  moon: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
  ),
  palette: (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
    </svg>
  ),
}

const navItems = [
  { to: '/dashboard',    label: 'Dashboard',  icon: icons.dashboard },
  { to: '/create-route', label: 'Create',     icon: icons.create },
  { to: '/routes',       label: 'Routes',     icon: icons.routes },
  { to: '/projects',     label: 'Projects',   icon: icons.projects },
  { to: '/test-api',     label: 'Test API',   icon: icons.testApi },
  { to: '/logs',         label: 'Logs',       icon: icons.logs },
  { to: '/audit',        label: 'Audit',      icon: icons.audit },
]

export default function Sidebar({ isOpen, toggle }: Props) {
  const navigate = useNavigate()
  const { mode, setMode } = useTheme()
  const [modeOpen, setModeOpen] = React.useState(false)
  const [routeCount, setRouteCount] = React.useState<number | null>(null)
  const { projects } = useProjectContext()

  React.useEffect(() => {
    listMocks().then(r => setRouteCount(r.length)).catch(() => {})
    const t = setInterval(() => { listMocks().then(r => setRouteCount(r.length)).catch(() => {}) }, 30000)
    return () => clearInterval(t)
  }, [])

  const modeOptions: { value: ThemeMode; label: string; icon: React.ReactNode }[] = [
    { value: 'light', label: 'Light Mode', icon: icons.sun },
    { value: 'dark',  label: 'Dark Mode',  icon: icons.moon },
  ]

  return (
    <aside
      className="h-screen backdrop-blur-xl transition-all duration-300 flex flex-col"
      style={{
        width: isOpen ? '240px' : '68px',
        background: 'var(--sidebar-bg)',
        borderRight: '1px solid var(--sidebar-border)',
      }}
    >
      {/* HEADER */}
      <div className="flex items-center justify-between px-4 py-5" style={{ borderBottom: '1px solid var(--sidebar-border)' }}>
        {/* TITLE */}
        <div className={`${isOpen ? 'block' : 'hidden'} transition-opacity duration-200`}>
          <div className="text-sm font-bold gradient-text tracking-tight">Mock Server</div>
          <div className="text-[10px] font-medium uppercase tracking-widest mt-0.5" style={{ color: 'var(--text-muted)' }}>Console</div>
        </div>

        {/* TOGGLE BUTTON */}
        <button
          className="p-1.5 rounded-lg transition-all duration-200"
          style={{ color: 'var(--text-secondary)' }}
          onClick={toggle}
        >
          {isOpen ? icons.collapse : icons.menu}
        </button>
      </div>

      {/* NAV */}
      <nav className="flex flex-col gap-1 px-3 py-4 flex-1 overflow-y-auto">
        {navItems.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => window.innerWidth < 768 && toggle()}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 group relative ${
                isActive
                  ? 'bg-accent/[0.12] text-accent-light'
                  : 'hover:bg-[var(--bg-card-hover)]'
              }`
            }
            style={({ isActive }) => isActive ? {} : { color: 'var(--text-secondary)' }}
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full gradient-accent" />
                )}
                {icon}
                {isOpen && (
                  <span className="truncate flex-1">{label}</span>
                )}
                {isOpen && label === 'Routes' && routeCount !== null && routeCount > 0 && (
                  <span className="ml-auto text-[10px] font-semibold bg-accent/20 text-accent-light rounded-full px-2 py-0.5">{routeCount}</span>
                )}
                {isOpen && label === 'Projects' && projects.length > 0 && (
                  <span className="ml-auto text-[10px] font-semibold bg-accent/20 text-accent-light rounded-full px-2 py-0.5">{projects.length}</span>
                )}
              </>
            )}
          </NavLink>
        ))}

        {/* ── MODE SECTION ────────────────────────── */}
        <div className="mt-2">
          <button
            onClick={() => setModeOpen(p => !p)}
            className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200"
            style={{ color: 'var(--text-secondary)' }}
          >
            {icons.palette}
            {isOpen && (
              <>
                <span className="flex-1 text-left truncate">Mode</span>
                <svg
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${modeOpen ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </>
            )}
          </button>

          {/* Expandable mode options */}
          {modeOpen && isOpen && (
            <div className="ml-4 mt-1 space-y-1 animate-fade-in">
              {modeOptions.map(opt => {
                const active = mode === opt.value
                return (
                  <button
                    key={opt.value}
                    onClick={() => setMode(opt.value)}
                    className={`w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-all duration-200 ${
                      active
                        ? 'bg-accent/[0.15] text-accent-light'
                        : ''
                    }`}
                    style={active ? {} : { color: 'var(--text-muted)' }}
                  >
                    {opt.icon}
                    <span>{opt.label}</span>
                    {active && (
                      <svg className="w-3.5 h-3.5 ml-auto text-accent-light" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                )
              })}
            </div>
          )}

          {/* Collapsed: just show icon toggle */}
          {!isOpen && (
            <button
              onClick={() => setMode(mode === 'dark' ? 'light' : 'dark')}
              className="w-full flex items-center justify-center rounded-lg px-3 py-2.5 transition-all duration-200"
              style={{ color: 'var(--text-secondary)' }}
              title={mode === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {mode === 'dark' ? icons.sun : icons.moon}
            </button>
          )}
        </div>
      </nav>

      {/* FOOTER */}
      <div className="px-3 py-4 space-y-3" style={{ borderTop: '1px solid var(--sidebar-border)' }}>
        {/* USER INFO */}
        {(() => {
          const user = getUserInfo()
          if (!user) return null
          const initials = user.olmId.slice(0, 2).toUpperCase()
          return (
            <div className={`flex items-center gap-3 px-3 py-2 ${isOpen ? '' : 'justify-center'}`}>
              <div className="w-8 h-8 rounded-lg gradient-accent flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                {initials}
              </div>
              {isOpen && (
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{user.olmId}</div>
                  <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Active</div>
                </div>
              )}
            </div>
          )
        })()}
        <button
          className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-400/80 hover:bg-red-500/[0.08] hover:text-red-400 transition-all duration-200 ${
            isOpen ? '' : 'justify-center'
          }`}
          onClick={() => {
            clearAuthToken()
            navigate('/login', { replace: true })
          }}
        >
          {icons.logout}
          {isOpen && 'Logout'}
        </button>
      </div>
    </aside>
  )
}