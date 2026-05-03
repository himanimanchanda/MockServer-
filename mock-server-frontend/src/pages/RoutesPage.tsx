import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { MockDto } from '../types'
import {
  deleteMock,
  listMocks,
  listProjectMocks,
  searchMocks,
  listTrash,
  recoverMock,
} from '../api/client'
import RouteList from '../components/RouteList'
import Toast from '../components/Toast'
import type { ToastKind } from '../components/Toast'
import CurlModal from '../components/CurlModal'
import ConfirmModal from '../components/ConfirmModal'
import ViewJsonModal from '../components/ViewJsonModal'
import { useProjectContext } from '../context/ProjectContext'
import { exportToPostman, parsePostmanCollection } from '../utils/postman'
import { importMocks } from '../api/client'

/** Simple case-insensitive substring check helper (used in trash search) */
function highlight(text: string, _query: string): string {
  return text
}

export default function RoutesPage() {
  const navigate = useNavigate()
  const { projects, selectedProjectId, setSelectedProjectId } = useProjectContext()

  const [scope, setScope] = React.useState<'all' | 'project' | 'trash'>('all')
  const [mocks, setMocks] = React.useState<MockDto[]>([])
  const [loading, setLoading] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [searchLoading, setSearchLoading] = React.useState(false)
  const [toast, setToast] = React.useState<{ kind: ToastKind; message: string } | null>(null)
  const [curlModalMock, setCurlModalMock] = React.useState<MockDto | null>(null)
  const [viewModal, setViewModal] = React.useState<{ title: string; value: any } | null>(null)
  const [confirmDeleteMockId, setConfirmDeleteMockId] = React.useState<string | null>(null)
  const [confirmBusy, setConfirmBusy] = React.useState(false)
  const importFileRef = React.useRef<HTMLInputElement>(null)

  const PAGE_SIZE = 10
  const [pageIdx, setPageIdx] = React.useState(0)

  React.useEffect(() => {
    setPageIdx(0)
  }, [scope, selectedProjectId, searchQuery])

  const totalPages = mocks.length === 0 ? 1 : Math.ceil(mocks.length / PAGE_SIZE)
  const clampedIdx = Math.min(pageIdx, Math.max(0, totalPages - 1))
  const pagedMocks = mocks.slice(clampedIdx * PAGE_SIZE, (clampedIdx + 1) * PAGE_SIZE)
  React.useEffect(() => {
    if (clampedIdx !== pageIdx) setPageIdx(clampedIdx)
  }, [clampedIdx, pageIdx])

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const json = JSON.parse(text)
      const parsed = parsePostmanCollection(json)
      if (parsed.length === 0) {
        setToast({ kind: 'error', message: 'No valid routes found in this collection' })
        return
      }
      setLoading(true)
      const created = await importMocks(parsed)
      setToast({ kind: 'success', message: `Imported ${created.length} routes from Postman` })
      await refreshMocks()
    } catch (err: any) {
      setToast({ kind: 'error', message: err?.message || 'Failed to parse collection' })
    } finally {
      setLoading(false)
      if (importFileRef.current) importFileRef.current.value = ''
    }
  }

  async function refreshMocks() {
    setLoading(true)
    try {
      if (scope === 'trash') {
        const res = await listTrash()
        setMocks(res)
      } else if (scope === 'all') {
        const res = await listMocks()
        setMocks(res)
      } else {
        const pid = selectedProjectId
        if (!pid) {
          setMocks([])
          return
        }
        const res = await listProjectMocks(pid)
        setMocks(res)
      }
    } catch (e: any) {
      setToast({ kind: 'error', message: e?.message || 'Failed to load routes' })
    } finally {
      setLoading(false)
    }
  }

  async function refreshSearch(q: string) {
    const query = q.trim()
    if (!query) {
      await refreshMocks()
      return
    }

    setSearchLoading(true)
    try {
      if (scope === 'trash') {
        const results = await listTrash()
        setMocks(results.filter(m => highlight(m.endpoint, query).toString().toLowerCase().includes(query.toLowerCase())))
        return
      }

      const results = await searchMocks(query)
      if (scope === 'project' && selectedProjectId) {
        setMocks(results.filter((m) => m.projectId === selectedProjectId))
      } else {
        setMocks(results)
      }
    } catch (e: any) {
      setToast({ kind: 'error', message: e?.message || 'Search failed' })
    } finally {
      setSearchLoading(false)
    }
  }

  React.useEffect(() => {
    refreshMocks()
  }, [scope, selectedProjectId])

  React.useEffect(() => {
    const t = window.setTimeout(() => refreshSearch(searchQuery), 350)
    return () => window.clearTimeout(t)
  }, [searchQuery, scope, selectedProjectId])

  async function handleDelete(id: string) {
    setConfirmDeleteMockId(id)
  }

  return (
    <div className="space-y-5 animate-slide-up">
      {toast && <Toast kind={toast.kind} message={toast.message} onClose={() => setToast(null)} />}

      <div className="glass rounded-2xl overflow-hidden min-h-[calc(100vh-120px)] flex flex-col">
        {/* HEADER */}
        <div className="flex flex-col border-b gradient-accent px-4 sm:px-6 pt-5 pb-0" style={{borderColor:'var(--border-color)'}}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
            <div>
              <div className="text-xl font-extrabold text-white tracking-tight">Mock Routes</div>
              <div className="text-sm text-white/70 mt-0.5">Manage your API mocks and collections</div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input type="file" ref={importFileRef} accept=".json" className="hidden" onChange={handleImportFile} />
              <button
                className="rounded-lg bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/20 transition-all duration-200 backdrop-blur"
                onClick={() => importFileRef.current?.click()}
              >
                <span className="opacity-70 mr-1.5">↓</span> Import Postman
              </button>

              <button
                className="rounded-lg bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/20 transition-all duration-200 backdrop-blur"
                onClick={() => {
                  const pName = selectedProjectId 
                    ? projects.find(p => p.id === selectedProjectId)?.name 
                    : 'All Mocks'
                  exportToPostman(mocks, pName || 'Mock Server Export')
                  setToast({ kind: 'success', message: 'Exported to Postman Collection' })
                }}
              >
                <span className="opacity-70 mr-1.5">↑</span> Export Postman
              </button>

              <button
                className="rounded-lg bg-white px-4 py-2 text-xs font-bold text-accent-light hover:bg-white/90 transition-all duration-200 shadow-lg shadow-black/10"
                onClick={() => navigate('/create-route')}
              >
                + Create API
              </button>
            </div>
          </div>

          <div className="flex gap-6 border-b border-white/10">
            <button
              className={`pb-3 text-sm font-semibold transition-all duration-200 border-b-2 ${
                scope === 'all' ? 'border-white text-white' : 'border-transparent text-white/60 hover:text-white/90'
              }`}
              onClick={() => setScope('all')}
            >
              All Routes
            </button>
            <button
              className={`pb-3 text-sm font-semibold transition-all duration-200 border-b-2 ${
                scope === 'project' ? 'border-white text-white' : 'border-transparent text-white/60 hover:text-white/90'
              }`}
              onClick={() => setScope('project')}
              disabled={!selectedProjectId}
              title={!selectedProjectId ? 'Select a project first' : undefined}
            >
              Project Routes
            </button>
            <button
              className={`pb-3 text-sm font-semibold transition-all duration-200 border-b-2 ${
                scope === 'trash' ? 'border-white text-white' : 'border-transparent text-white/60 hover:text-white/90'
              }`}
              onClick={() => setScope('trash')}
            >
              Trash
            </button>
          </div>
        </div>

        {/* BODY */}
        <div className="p-3 sm:p-5 flex-1 flex flex-col">
          {/* SEARCH + FILTER */}
          <div className="mb-4 sm:mb-5 grid grid-cols-1 sm:grid-cols-12 items-end gap-3 sm:gap-4">
            <div className="sm:col-span-4">
              <label className="text-[11px] font-semibold uppercase tracking-wider t-label">Search API</label>
              <div className="flex gap-2 mt-1.5">
                <input
                  className="flex-1 rounded-xl input-dark px-4 py-2.5 text-sm"
                  placeholder="Search endpoints..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button
                  className="btn-gradient rounded-xl px-5 py-2.5 text-xs font-semibold"
                  onClick={() => refreshSearch(searchQuery)}
                >
                  {searchLoading ? '...' : 'Search'}
                </button>
              </div>
            </div>

            <div className="hidden sm:block sm:col-span-4 text-center pb-2">
              <div className="inline-flex flex-col items-center justify-center gap-1">
                <span className="text-3xl font-black t-heading">{mocks.length}</span>
                <span className="text-[10px] uppercase font-bold tracking-widest t-muted">Routes Found</span>
                {mocks.length > PAGE_SIZE ? (
                  <span className="text-[11px] t-secondary">
                    Page {clampedIdx + 1} / {totalPages} — {PAGE_SIZE} per page
                  </span>
                ) : null}
              </div>
            </div>

            <div className="sm:col-span-4">
              <label className="text-[11px] font-semibold uppercase tracking-wider t-label">Active Project</label>
              <div className="flex gap-2 mt-1.5">
                <select
                  className="flex-1 rounded-xl input-dark px-4 py-2.5 text-sm"
                  value={selectedProjectId ?? ''}
                  onChange={(e) => setSelectedProjectId(e.target.value || null)}
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>

                <Link to="/projects" className="btn-gradient rounded-xl px-4 py-2.5 text-xs font-semibold">
                  Manage
                </Link>
              </div>
            </div>
          </div>

          {/* ROUTES LIST */}
          <div className="space-y-4">
            <RouteList
              loading={loading}
              mocks={pagedMocks}
              searchQuery={searchQuery}
              isTrash={scope === 'trash'}
              onRecover={async (id) => {
                setLoading(true)
                try {
                  await recoverMock(id)
                  setToast({ kind: 'success', message: 'Route recovered successfully!' })
                  setMocks((prev) => prev.filter((m) => m.id !== id))
                } catch (e: any) {
                  setToast({ kind: 'error', message: e?.message || 'Failed to recover' })
                } finally {
                  setLoading(false)
                }
              }}
              onEdit={(m) => navigate('/create-route', { state: m })}
              onDelete={handleDelete}
              onClone={(m) => navigate('/create-route', { state: { ...m, id: undefined, endpoint: m.endpoint + '-copy' } })}
              onViewCurl={(m) => setCurlModalMock(m)}
              onViewQueryParams={(m) => setViewModal({ title: 'Query Params', value: m.queryParams ?? {} })}
              onViewHeaders={(m) => setViewModal({ title: 'Headers', value: m.headers ?? {} })}
              onViewBody={(m) => setViewModal({ title: 'Body', value: m.requestBody ?? '-' })}
              onViewResponse={(m) => setViewModal({ title: 'Response', value: m.responseBody })}
              onTestApi={(m) =>
                navigate('/test-api', {
                  state: { endpoint: m.endpoint },
                })
              }
            />
            {mocks.length > PAGE_SIZE ? (
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs t-secondary">
                <span>
                  Showing {clampedIdx * PAGE_SIZE + 1}-{Math.min((clampedIdx + 1) * PAGE_SIZE, mocks.length)} of {mocks.length}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn-glass rounded-lg px-3 py-1.5 disabled:opacity-40"
                    disabled={clampedIdx <= 0}
                    onClick={() => setPageIdx((p) => Math.max(0, p - 1))}
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    className="btn-glass rounded-lg px-3 py-1.5 disabled:opacity-40"
                    disabled={clampedIdx + 1 >= totalPages}
                    onClick={() => setPageIdx((p) => p + 1)}
                  >
                    Next
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {curlModalMock && <CurlModal mock={curlModalMock} onClose={() => setCurlModalMock(null)} />}

      {viewModal && <ViewJsonModal title={viewModal.title} value={viewModal.value} onClose={() => setViewModal(null)} />}

      {confirmDeleteMockId && (
        <ConfirmModal
          title="Delete route"
          message="Are you sure?"
          confirmText="Delete"
          kind="danger"
          busy={confirmBusy}
          onCancel={() => setConfirmDeleteMockId(null)}
          onConfirm={async () => {
            setConfirmBusy(true)
            await deleteMock(confirmDeleteMockId)
            setMocks((prev) => prev.filter((m) => m.id !== confirmDeleteMockId))
            setConfirmDeleteMockId(null)
            setConfirmBusy(false)
          }}
        />
      )}
    </div>
  )
}