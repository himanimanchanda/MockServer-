import React from 'react'
import type { ProjectDto } from '../types'
import { createProject, deleteProject, migrate as migrateApi } from '../api/client'
import Toast from '../components/Toast'
import type { ToastKind } from '../components/Toast'
import ConfirmModal from '../components/ConfirmModal'
import { useProjectContext } from '../context/ProjectContext'

export default function ProjectsPage() {
  const { projects, selectedProjectId, setSelectedProjectId, refreshProjects, projectsLoading } = useProjectContext()
  const [toast, setToast] = React.useState<{ kind: ToastKind; message: string } | null>(null)
  const [createOpen, setCreateOpen] = React.useState(false)
  const [migrateOpen, setMigrateOpen] = React.useState(false)
  const [createProjectName, setCreateProjectName] = React.useState('')
  const [migrateFrom, setMigrateFrom] = React.useState<string | null>(null)
  const [migrateTo, setMigrateTo] = React.useState<string | null>(null)
  const [confirmDeleteProject, setConfirmDeleteProject] = React.useState<ProjectDto | null>(null)
  const [confirmBusy, setConfirmBusy] = React.useState(false)

  async function handleMigrate() {
    if (!migrateFrom || !migrateTo || migrateFrom === migrateTo) {
      setToast({ kind: 'error', message: 'Select valid source and destination projects.' })
      return
    }
    try {
      await migrateApi({ fromProjectId: migrateFrom, toProjectId: migrateTo })
      setToast({ kind: 'success', message: 'Migration completed.' })
      setMigrateOpen(false)
      setMigrateFrom(null)
      setMigrateTo(null)
      await refreshProjects()
    } catch (e: any) {
      setToast({ kind: 'error', message: e?.response?.data?.message || e?.message || 'Migration failed' })
    }
  }

  return (
    <div className="space-y-5 animate-slide-up">
      {toast && <Toast kind={toast.kind} message={toast.message} onClose={() => setToast(null)} />}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold t-heading">Projects</h1>
          <p className="mt-1 text-sm t-secondary">Create projects and choose which one routes belong to.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-gradient rounded-xl px-5 py-2.5 text-sm font-semibold"
            onClick={() => setCreateOpen(true)}
          >
            + Create Project
          </button>
          <button
            type="button"
            className="btn-glass rounded-xl px-5 py-2.5 text-sm font-medium"
            onClick={() => setMigrateOpen(true)}
            disabled={projects.length < 2}
          >
            Migrate Mocks
          </button>
        </div>
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        <div className="border-b px-5 py-4" style={{borderColor:'var(--border-color)'}}>
          <div className="text-sm font-bold t-heading">All Projects</div>
          <div className="mt-1 text-xs t-muted">
            Selected for new routes:{' '}
            <span className="font-mono font-semibold text-accent-light">
              {projects.find((p) => p.id === selectedProjectId)?.name ?? '—'}
            </span>
          </div>
        </div>
        <div className="p-5">
          {projectsLoading ? (
            <div className="text-sm text-slate-400">Loading projects…</div>
          ) : projects.length === 0 ? (
            <div className="rounded-xl border border-dashed p-5 text-sm t-secondary" style={{borderColor:'var(--border-color)', background:'var(--bg-card)'}}>
              No projects yet. Create one to start adding mock routes.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b" style={{borderColor:'var(--border-color)'}}>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider t-label">Name</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider t-label">ID</th>
                    <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider t-label">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((p) => (
                    <tr key={p.id} className="border-b hover:bg-[var(--bg-card-hover)] transition-colors" style={{borderColor:'var(--border-color)'}}>
                      <td className="px-4 py-3 font-medium t-heading">{p.name}</td>
                      <td className="px-4 py-3 font-mono text-xs t-secondary">{p.id}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2 flex-wrap">
                          <button
                            type="button"
                            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                              selectedProjectId === p.id
                                ? 'bg-accent/20 text-accent-light border border-accent/30'
                                : 'btn-glass'
                            }`}
                            onClick={() => {
                              setSelectedProjectId(p.id)
                              setToast({ kind: 'success', message: 'Project selected.' })
                            }}
                          >
                            {selectedProjectId === p.id ? '✓ Selected' : 'Select'}
                          </button>
                          <button
                            type="button"
                            className="btn-danger rounded-lg px-3 py-1.5 text-xs font-medium"
                            onClick={() => setConfirmDeleteProject(p)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* CREATE PROJECT MODAL */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md glass-strong rounded-2xl shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between border-b px-5 py-4" style={{borderColor:'var(--border-color)'}}>
              <div>
                <div className="text-sm font-bold t-heading">Create Project</div>
                <div className="text-xs t-muted">Projects group API mocks.</div>
              </div>
              <button
                type="button"
                className="btn-glass rounded-lg px-3 py-1.5 text-xs font-medium"
                onClick={() => setCreateOpen(false)}
              >
                Close
              </button>
            </div>
            <div className="space-y-4 p-5">
              <label className="block text-[11px] font-semibold uppercase tracking-wider t-label">Project Name</label>
              <input
                className="w-full rounded-xl input-dark px-4 py-3 text-sm"
                placeholder="e.g. Payment Gateway"
                value={createProjectName}
                onChange={(e) => setCreateProjectName(e.target.value)}
              />
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  className="btn-glass rounded-xl px-5 py-2.5 text-sm font-medium"
                  onClick={() => setCreateOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-gradient rounded-xl px-5 py-2.5 text-sm font-semibold"
                  onClick={async () => {
                    if (!createProjectName.trim()) {
                      setToast({ kind: 'error', message: 'Project name is required.' })
                      return
                    }
                    try {
                      const p = await createProject({ name: createProjectName.trim() })
                      setCreateProjectName('')
                      setCreateOpen(false)
                      setSelectedProjectId(p.id)
                      setToast({ kind: 'success', message: 'Project created.' })
                      await refreshProjects()
                    } catch (e: any) {
                      setToast({
                        kind: 'error',
                        message: e?.response?.data?.message || e?.message || 'Failed to create project',
                      })
                    }
                  }}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MIGRATE MODAL */}
      {migrateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl glass-strong rounded-2xl shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between border-b px-5 py-4" style={{borderColor:'var(--border-color)'}}>
              <div>
                <div className="text-sm font-bold t-heading">Migrate Mocks</div>
                <div className="text-xs t-muted">Copy mocks from one project to another.</div>
              </div>
              <button
                type="button"
                className="btn-glass rounded-lg px-3 py-1.5 text-xs font-medium"
                onClick={() => setMigrateOpen(false)}
              >
                Close
              </button>
            </div>
            <div className="space-y-4 p-5">
              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-6">
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider t-label">From</label>
                  <select
                    className="w-full rounded-xl input-dark px-4 py-3 text-sm"
                    value={migrateFrom ?? ''}
                    onChange={(e) => setMigrateFrom(e.target.value || null)}
                  >
                    <option value="">Select source</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-6">
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider t-label">To</label>
                  <select
                    className="w-full rounded-xl input-dark px-4 py-3 text-sm"
                    value={migrateTo ?? ''}
                    onChange={(e) => setMigrateTo(e.target.value || null)}
                  >
                    <option value="">Select destination</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="text-xs t-muted">
                This creates new mocks in the destination project (source mocks are not deleted).
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  className="btn-glass rounded-xl px-5 py-2.5 text-sm font-medium"
                  onClick={() => setMigrateOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-gradient rounded-xl px-5 py-2.5 text-sm font-semibold"
                  onClick={handleMigrate}
                  disabled={!projects.length}
                >
                  Copy Mocks
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmDeleteProject && (
        <ConfirmModal
          title="Delete project"
          message={`Are you sure you want to delete this project? This will also delete its routes.\n\nProject: ${confirmDeleteProject.name}`}
          confirmText="Delete project"
          kind="danger"
          busy={confirmBusy}
          onCancel={() => {
            if (confirmBusy) return
            setConfirmDeleteProject(null)
          }}
          onConfirm={async () => {
            setConfirmBusy(true)
            try {
              await deleteProject(confirmDeleteProject.id)
              setConfirmDeleteProject(null)
              await refreshProjects()
              setToast({ kind: 'success', message: 'Project deleted.' })
            } catch (e: any) {
              setToast({ kind: 'error', message: e?.response?.data?.message || e?.message || 'Failed to delete project' })
            } finally {
              setConfirmBusy(false)
            }
          }}
        />
      )}
    </div>
  )
}
