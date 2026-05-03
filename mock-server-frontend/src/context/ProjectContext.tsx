import React from 'react'
import { listProjects } from '../api/client'
import type { ProjectDto } from '../types'

const SELECTED_KEY = 'mockserver.selectedProjectId'

export type ProjectContextValue = {
  projects: ProjectDto[]
  selectedProjectId: string | null
  setSelectedProjectId: (id: string | null) => void
  refreshProjects: () => Promise<void>
  projectsLoading: boolean
}

const ProjectContext = React.createContext<ProjectContextValue | null>(null)

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = React.useState<ProjectDto[]>([])
  const [selectedProjectId, setSelectedProjectIdState] = React.useState<string | null>(() => sessionStorage.getItem(SELECTED_KEY))
  const [projectsLoading, setProjectsLoading] = React.useState(false)

  const setSelectedProjectId = React.useCallback((id: string | null) => {
    setSelectedProjectIdState(id)
    if (id) sessionStorage.setItem(SELECTED_KEY, id)
    else sessionStorage.removeItem(SELECTED_KEY)
  }, [])

  const refreshProjects = React.useCallback(async () => {
    setProjectsLoading(true)
    try {
      const res = await listProjects()
      setProjects(res)
      setSelectedProjectIdState((prev) => {
        let next: string | null = null
        if (prev && res.some((p) => p.id === prev)) next = prev
        else {
          const stored = sessionStorage.getItem(SELECTED_KEY)
          if (stored && res.some((p) => p.id === stored)) next = stored
          else if (res.length > 0) next = res[0].id
        }
        if (next) sessionStorage.setItem(SELECTED_KEY, next)
        else sessionStorage.removeItem(SELECTED_KEY)
        return next
      })
    } finally {
      setProjectsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void refreshProjects()
  }, [refreshProjects])

  const value = React.useMemo(
    () => ({
      projects,
      selectedProjectId,
      setSelectedProjectId,
      refreshProjects,
      projectsLoading,
    }),
    [projects, selectedProjectId, setSelectedProjectId, refreshProjects, projectsLoading]
  )

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>
}

export function useProjectContext(): ProjectContextValue {
  const ctx = React.useContext(ProjectContext)
  if (!ctx) throw new Error('useProjectContext must be used within ProjectProvider')
  return ctx
}
