import React from 'react'
import { Link } from 'react-router-dom'
import { listMocks } from '../api/client'
import { useProjectContext } from '../context/ProjectContext'

const cardIcons = {
  projects: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  ),
  routes: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  testApi: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  logs: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  ),
}

const gradients = [
  'from-violet-500/20 to-indigo-500/20',
  'from-blue-500/20 to-cyan-500/20',
  'from-emerald-500/20 to-teal-500/20',
  'from-amber-500/20 to-orange-500/20',
]

const iconColors = [
  'text-violet-400',
  'text-blue-400',
  'text-emerald-400',
  'text-amber-400',
]

export default function DashboardPage() {
  const { projects, projectsLoading } = useProjectContext()
  const [routeCount, setRouteCount] = React.useState<number | null>(null)
  const [routesError, setRoutesError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let cancelled = false
    setRoutesError(null)
    listMocks()
      .then((r) => {
        if (!cancelled) setRouteCount(r.length)
      })
      .catch((e: any) => {
        if (!cancelled) setRoutesError(e?.message ?? 'Failed to load routes')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const cards = [
    {
      to: '/projects',
      label: 'Projects',
      value: projectsLoading ? '—' : projects.length,
      desc: 'Create and manage project groups.',
      icon: cardIcons.projects,
      gradient: gradients[0],
      iconColor: iconColors[0],
    },
    {
      to: '/routes',
      label: 'Mock Routes',
      value: routeCount === null ? '—' : routeCount,
      desc: routesError ? routesError : 'Total routes registered on the server.',
      icon: cardIcons.routes,
      gradient: gradients[1],
      iconColor: iconColors[1],
      isError: !!routesError,
    },
    {
      to: '/test-api',
      label: 'Test API',
      value: '→',
      desc: 'Exercise endpoints against the mock engine.',
      icon: cardIcons.testApi,
      gradient: gradients[2],
      iconColor: iconColors[2],
    },
    {
      to: '/audit',
      label: 'Audit Trail',
      value: 'View',
      desc: 'Review changes and actions performed on mocks.',
      icon: cardIcons.logs,
      gradient: gradients[3],
      iconColor: iconColors[3],
    },
  ]

  return (
    <div className="space-y-8 animate-slide-up">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold t-heading">Dashboard</h1>
        <p className="mt-1 text-sm t-secondary">Overview of your mock server workspace.</p>
      </div>

      {/* Cards Grid */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card, i) => (
          <Link
            key={card.to}
            to={card.to}
            className="group glass rounded-2xl p-5 transition-all duration-300 hover:bg-white/[0.06] hover:border-white/[0.14] hover:-translate-y-1 hover:shadow-lg hover:shadow-accent/5"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            {/* Icon */}
            <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br ${card.gradient} ${card.iconColor} mb-4`}>
              {card.icon}
            </div>

            <div className="text-[11px] font-semibold uppercase tracking-wider t-muted">{card.label}</div>
            <div className="mt-1 text-3xl font-bold t-heading">{card.value}</div>
            <div className={`mt-2 text-sm leading-relaxed ${card.isError ? 'text-red-400' : 't-secondary'}`}>
              {card.desc}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
