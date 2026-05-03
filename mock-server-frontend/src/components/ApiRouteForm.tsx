/**
 * ApiRouteForm.tsx
 *
 * Exact same UI as original Airtel mock server.
 * All fields wired to backend via onSave prop.
 * Supports static + dynamic values, project dropdown, all features.
 */

import React from 'react'
import type { CreateMockRequest, Environment, HttpMethod, KVRow, MockDto, ProjectDto } from '../types'
import { generateCurl, parseCurlToForm } from '../utils/curl'
import { listProjects, createProject } from '../api/client'
import Toast from './Toast'

const API_BASE = 'http://localhost:8080'

// ─── helpers ─────────────────────────────────────────────────────────────────

function toRows(map?: Record<string, string>): KVRow[] {
  if (!map) return []
  return Object.entries(map).map(([key, value]) => ({ key, value }))
}

function prettyJson(v: unknown): string {
  if (v == null) return ''
  if (typeof v === 'string') return v
  try { return JSON.stringify(v, null, 2) } catch { return String(v) }
}

function methodBtnClass(current: HttpMethod, target: HttpMethod) {
  const base = 'px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all duration-200'
  if (current === target) {
    const colors: Record<string, string> = {
      GET: 'method-get',
      POST: 'method-post',
      PUT: 'method-put',
      PATCH: 'method-patch',
      DELETE: 'method-delete',
    }
    return `${base} ${colors[target] || ''}`
  }
  return `${base} t-muted hover:t-primary`
}

// ─── props ───────────────────────────────────────────────────────────────────

interface Props {
  mode?: 'create' | 'edit'
  selectedMock?: MockDto | null
  selectedProjectId?: string | null
  onSave: (payload: CreateMockRequest) => Promise<void>
  onCancel?: () => void
  onCreateProject?: () => void
}

// ─── component ───────────────────────────────────────────────────────────────

export default function ApiRouteForm({
  mode = 'create',
  selectedMock,
  selectedProjectId: initialProjectId,
  onSave,
  onCancel,
}: Props) {

  // projects
  const [projects, setProjects]           = React.useState<ProjectDto[]>([])
  const [projectId, setProjectId]         = React.useState(selectedMock?.projectId ?? initialProjectId ?? '')
  const [projectsLoading, setProjectsLoading] = React.useState(true)
  const [showNewProject, setShowNewProject]   = React.useState(false)
  const [newProjectName, setNewProjectName]   = React.useState('')
  const [creatingProject, setCreatingProject] = React.useState(false)

  // core fields
  const [method, setMethod]           = React.useState<HttpMethod>((selectedMock?.method ?? 'POST') as HttpMethod)
  const [endpoint, setEndpoint]       = React.useState(selectedMock?.endpoint ?? '')
  const [testCase, setTestCase]       = React.useState(selectedMock?.testCase ?? '')
  const [description, setDescription] = React.useState(selectedMock?.description ?? '')
  const [contentType, setContentType] = React.useState(selectedMock?.contentType ?? 'application/json')
  const [environment, setEnvironment] = React.useState<Environment>(selectedMock?.environment ?? 'DEV')
  const [statusCode, setStatusCode]   = React.useState(selectedMock?.statusCode ?? 200)
  const [delay, setDelay]             = React.useState(selectedMock?.delayMs ?? 0)
  const [isTemp, setIsTemp]           = React.useState(selectedMock?.isTemp ?? false)
  const [toggleResponse, setToggleResponse] = React.useState(selectedMock?.toggleResponse ?? false)

  // bodies
  const [requestBody, setRequestBody]   = React.useState(
    selectedMock?.requestBody ?? ''
  )
  const [responseBody, setResponseBody] = React.useState(
    prettyJson(selectedMock?.responseBody) || ''
  )

  // request headers
  const [headersList, setHeadersList] = React.useState<KVRow[]>(toRows(selectedMock?.headers))
  const [hKey, setHKey]     = React.useState('')
  const [hValue, setHValue] = React.useState('')
  const [hDynamic, setHDynamic] = React.useState(false)

  // query params
  const [queryList, setQueryList] = React.useState<KVRow[]>(toRows(selectedMock?.queryParams))
  const [qKey, setQKey]     = React.useState('')
  const [qValue, setQValue] = React.useState('')
  const [qDynamic, setQDynamic] = React.useState(false)

  // response headers
  const [responseHeadersList, setResponseHeadersList] = React.useState<KVRow[]>(
    toRows(selectedMock?.responseHeaders)
  )
  const [rKey, setRKey]   = React.useState('')
  const [rValue, setRValue] = React.useState('')

  // curl input
  const [curlInput, setCurlInput] = React.useState('')

  // ui state
  const [loading, setLoading]         = React.useState(false)
  const [error, setError]             = React.useState<string | null>(null)
  const [showSuccess, setShowSuccess] = React.useState(false)
  const [generatedCurl, setGeneratedCurl] = React.useState('')
  const [copyToast, setCopyToast] = React.useState(false)

  async function handleCopyCurl() {
    try {
      await navigator.clipboard.writeText(generatedCurl)
      setCopyToast(true)
      setTimeout(() => setCopyToast(false), 2000)
    } catch {
      setError('Copy failed (clipboard permissions).')
    }
  }
  React.useEffect(() => {
    listProjects()
      .then(data => {
        setProjects(data)
        setProjectId(prev => {
          if (prev && data.some(p => p.id === prev)) return prev
          if (initialProjectId && data.some(p => p.id === initialProjectId)) return initialProjectId
          return data.length > 0 ? data[0].id : ''
        })
      })
      .catch(() => {})
      .finally(() => setProjectsLoading(false))
  }, [])

  async function handleCreateProject() {
    if (!newProjectName.trim()) return
    setCreatingProject(true)
    try {
      const p = await createProject({ name: newProjectName.trim() })
      setProjects(prev => [...prev, p])
      setProjectId(p.id)
      setNewProjectName('')
      setShowNewProject(false)
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Failed to create project')
    } finally {
      setCreatingProject(false)
    }
  }

  function addHeader() {
    if (!hKey.trim()) return
    setHeadersList(p => [...p, { key: hKey.trim(), value: hValue, dynamic: hDynamic }])
    setHKey(''); setHValue(''); setHDynamic(false)
  }
  function addQuery() {
    if (!qKey.trim()) return
    setQueryList(p => [...p, { key: qKey.trim(), value: qValue, dynamic: qDynamic }])
    setQKey(''); setQValue(''); setQDynamic(false)
  }
  function addResponseHeader() {
    if (!rKey.trim()) return
    setResponseHeadersList(p => [...p, { key: rKey.trim(), value: rValue }])
    setRKey(''); setRValue('')
  }

  async function handleSubmit() {
    setError(null)
    if (!endpoint.trim()) { setError('Request Path is required.'); return }
    if (!responseBody.trim()) { setError('Response Body is required.'); return }
    try { JSON.parse(responseBody) } catch {
      setError('Response Body must be valid JSON.')
      return
    }

    const path = endpoint.trim().startsWith('/') ? endpoint.trim() : `/${endpoint.trim()}`

    const payload: CreateMockRequest = {
      projectId:           projectId || undefined,
      endpoint:            path,
      method,
      testCase:            testCase.trim() || undefined,
      description:         description.trim() || undefined,
      requestBody:         requestBody.trim() || undefined,
      responseBody:        responseBody.trim(),
      statusCode,
      contentType,
      environment,
      delay,
      delayMs:             delay,
      isTemp,
      toggleResponse,
      headersList,
      queryList,
      responseHeadersList,
    }

    setLoading(true)
    try {
      await onSave(payload)
      setGeneratedCurl(generateCurl({
        path,
        method,
        headers:     headersList,
        queryParams: queryList,
        body:        requestBody,
        contentType,
        baseUrl:     API_BASE,
      }))
      setShowSuccess(true)
    } catch (e: any) {
      setError(
        e?.response?.data?.message ??
        e?.response?.data?.error ??
        e?.message ??
        'Something went wrong.'
      )
    } finally {
      setLoading(false)
    }
  }

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen">

      {/* SUCCESS MODAL */}
      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl glass-strong rounded-2xl p-6 shadow-2xl animate-scale-in relative">
            {/* Close button */}
            <button
              className="absolute top-4 right-4 p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all duration-200"
              onClick={() => setShowSuccess(false)}
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="text-center mb-4">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/20 mb-3">
                <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-bold t-heading">API Created Successfully</h2>
            </div>
            <p className="text-xs t-muted mb-2">The Curl For Generated API is:</p>
            <pre className="rounded-xl p-4 pr-4 text-emerald-400 font-mono text-xs whitespace-pre-wrap break-all max-h-48 overflow-auto" style={{background:'var(--code-bg)',border:'1px solid var(--border-color)'}}>
              {generatedCurl}
            </pre>
            <button
              className="mt-2 w-full flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/30 hover:bg-blue-500/25 hover:text-blue-300 transition-all duration-200"
              onClick={handleCopyCurl}
            >
              {copyToast ? (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                  Copy Curl Command
                </>
              )}
            </button>
            <p className="mt-3 text-xs t-muted text-center">
              Hit in Postman: <strong className="text-accent-light">{API_BASE}{endpoint}</strong> with <strong className="text-accent-light">{method}</strong>
            </p>
            <div className="mt-5 flex justify-center gap-3">
              <button
                className="btn-gradient rounded-xl px-6 py-2.5 text-sm font-semibold"
                onClick={() => { setShowSuccess(false); onCancel?.() }}
              >
                Go to Routes
              </button>
              <button
                className="btn-glass rounded-xl px-6 py-2.5 text-sm font-medium"
                onClick={() => {
                  setShowSuccess(false)
                  // reset form for new entry
                  setEndpoint(''); setTestCase(''); setDescription('')
                  setRequestBody('')
                  setResponseBody('')
                  setHeadersList([]); setQueryList([]); setResponseHeadersList([])
                  setDelay(0); setIsTemp(false); setToggleResponse(false)
                }}
              >
                Create Another
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto py-4 space-y-6">

        <div className="text-center">
          <h1 className="text-2xl font-bold gradient-text">
            {mode === 'edit' ? 'Edit API Route' : 'Create API Route'}
          </h1>
          <p className="text-sm t-secondary mt-1">Provide API specifications below</p>
        </div>

        {/* ERROR */}
        {error && (
          <div className="fixed bottom-6 right-6 z-50 min-w-[300px] max-w-md drop-shadow-2xl">
            <Toast
              kind="error"
              message={error}
              onClose={() => setError(null)}
            />
          </div>
        )}

        {/* SELECT PROJECT */}
        <Section title="Project">
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider t-label">Select Project *</label>
            {projectsLoading ? (
              <p className="text-xs t-muted mt-1">Loading projects...</p>
            ) : (
              <>
                <div className="flex items-center gap-2 mt-2">
                  <select
                    className="flex-1 rounded-xl input-dark px-4 py-2.5 text-sm"
                    value={projectId}
                    onChange={e => setProjectId(e.target.value)}
                  >
                    {projects.length === 0 && <option value="">— No projects yet, create one below —</option>}
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="btn-gradient rounded-xl px-4 py-2.5 text-xs font-semibold whitespace-nowrap"
                    onClick={() => setShowNewProject(v => !v)}
                  >
                    + New
                  </button>
                </div>
                {showNewProject && (
                  <div className="mt-3 flex gap-2 items-center p-4 rounded-xl border border-accent/20 bg-accent/5">
                    <input
                      className="flex-1 rounded-xl input-dark px-3 py-2 text-sm"
                      placeholder="Project name e.g. Payment Gateway"
                      value={newProjectName}
                      onChange={e => setNewProjectName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleCreateProject()}
                      autoFocus
                    />
                    <button
                      className="btn-gradient rounded-xl px-4 py-2 text-xs font-semibold disabled:opacity-50"
                      onClick={handleCreateProject}
                      disabled={creatingProject || !newProjectName.trim()}
                    >
                      {creatingProject ? 'Creating...' : 'Create'}
                    </button>
                    <button className="text-xs t-muted hover:t-primary" onClick={() => setShowNewProject(false)}>Cancel</button>
                  </div>
                )}
              </>
            )}
          </div>
        </Section>

        {/* REQUEST CONFIG */}
        <Section title="Request Configuration">
          {/* METHOD PILLS */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider t-label">Request Type</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {(['POST', 'GET', 'PUT', 'PATCH', 'DELETE'] as HttpMethod[]).map(m => (
                <button key={m} type="button" className={methodBtnClass(method, m)} onClick={() => setMethod(m)}>
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* ENVIRONMENT */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider t-label">Environment</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {(['DEV', 'QA', 'PROD'] as Environment[]).map(env => (
                <button
                  key={env}
                  type="button"
                  className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all duration-200 ${
                    environment === env
                      ? 'bg-accent/20 text-accent-light border border-accent/30'
                      : 't-muted hover:t-primary'
                  }`}
                  onClick={() => setEnvironment(env)}
                >
                  {env}
                </button>
              ))}
            </div>
          </div>

          {/* REQUEST PATH */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider t-label">Request Path *</label>
            <input
              className="w-full mt-2 rounded-xl input-dark px-4 py-2.5 text-sm font-mono"
              value={endpoint}
              onChange={e => setEndpoint(e.target.value)}
            />
            <div className="text-xs text-accent-light/70 mt-2 space-y-0.5">
              <p>For Dynamic Path Params:</p>
              <p className="ml-3">• Append : to param name. Example: /path/to/:id/:name</p>
            </div>
          </div>

          {/* TEST CASE */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider t-label">Test Case</label>
            <input
              className="w-full mt-2 rounded-xl input-dark px-4 py-2.5 text-sm"
              value={testCase}
              onChange={e => setTestCase(e.target.value)}
            />
          </div>

          {/* DESCRIPTION */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider t-label">Description</label>
            <input
              className="w-full mt-2 rounded-xl input-dark px-4 py-2.5 text-sm"
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          {/* CONTENT TYPE */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider t-label">Content Type</label>
            <select
              className="w-full mt-2 rounded-xl input-dark px-4 py-2.5 text-sm"
              value={contentType}
              onChange={e => setContentType(e.target.value)}
            >
              <option value="application/json">application/json</option>
              <option value="application/x-www-form-urlencoded">application/x-www-form-urlencoded</option>
              <option value="form-data">form-data</option>
            </select>
          </div>
        </Section>

        {/* REQUEST BODY */}
        <Section title="Request Body">
          <textarea
            className="w-full rounded-xl input-dark p-4 font-mono text-sm resize-none"
            rows={5}
            value={requestBody}
            onChange={e => setRequestBody(e.target.value)}
            spellCheck={false}
          />
          <div className="text-accent-light/70 text-xs space-y-1">
            <p className="font-semibold">For Variables:</p>
            <ul className="list-disc ml-5 space-y-0.5">
              <li>For variable keys in JSON, use value as <span className="font-bold text-accent-light">$</span></li>
              <li>Example: <span className="font-mono">{"{ \"name\": \"$\" }"}</span></li>
            </ul>
          </div>
        </Section>

        {/* REQUEST HEADERS */}
        <Section title="Request Headers">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-1 min-w-[100px]">
              <span className="text-xs w-[36px] t-muted">Key:</span>
              <input className="flex-1 rounded-xl input-dark px-3 py-2.5 text-sm" placeholder="Header name" value={hKey} onChange={e => setHKey(e.target.value)} />
            </div>
            <div className="flex items-center gap-2 flex-1 min-w-[100px]">
              <span className="text-xs w-[42px] t-muted">Value:</span>
              <div className="flex items-center flex-1 rounded-xl input-dark px-3 py-2.5">
                {hDynamic && <span className="mr-1 text-accent-light text-sm font-bold">$</span>}
                <input className="outline-none w-full text-sm bg-transparent t-primary" placeholder="Header value" value={hValue} onChange={e => setHValue(e.target.value)} />
              </div>
            </div>
            <div className="pill-toggle">
              <button type="button" onClick={() => setHDynamic(false)} className={`pill-toggle-btn ${!hDynamic ? 'pill-active-static' : ''}`}>Static</button>
              <button type="button" onClick={() => setHDynamic(true)} className={`pill-toggle-btn ${hDynamic ? 'pill-active-dynamic' : ''}`}>Dynamic</button>
            </div>
            <button onClick={addHeader} className="btn-gradient rounded-xl px-4 py-2.5 text-xs font-semibold">ADD</button>
          </div>
          {headersList.map((h, i) => (
            <div key={i} className={`flex items-center gap-3 text-sm px-4 py-2 rounded-xl transition-all duration-200 ${h.dynamic ? 'kv-row-dynamic' : ''}`} style={{background:'var(--bg-card)', border:'1px solid var(--border-color)'}}>
              <span className="flex-1 font-mono text-xs" style={{color:'var(--text-secondary)'}}>
                {h.key}: {h.dynamic ? <span className="text-accent-light font-bold">${h.value}</span> : h.value}
                {h.dynamic && <span className="ml-2 text-accent-light/70 text-[10px] font-semibold">⚡ dynamic</span>}
              </span>
              <button onClick={() => setHeadersList(p => p.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-300 text-xs font-medium">✕ Remove</button>
            </div>
          ))}
        </Section>

        {/* QUERY PARAMS */}
        <Section title="Request Query Params">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-1 min-w-[100px]">
              <span className="text-xs w-[36px] t-muted">Key:</span>
              <input className="flex-1 rounded-xl input-dark px-3 py-2.5 text-sm" placeholder="Param name" value={qKey} onChange={e => setQKey(e.target.value)} />
            </div>
            <div className="flex items-center gap-2 flex-1 min-w-[100px]">
              <span className="text-xs w-[42px] t-muted">Value:</span>
              <div className="flex items-center flex-1 rounded-xl input-dark px-3 py-2.5">
                {qDynamic && <span className="mr-1 text-accent-light text-sm font-bold">$</span>}
                <input className="outline-none w-full text-sm bg-transparent t-primary" placeholder="Param value" value={qValue} onChange={e => setQValue(e.target.value)} />
              </div>
            </div>
            <div className="pill-toggle">
              <button type="button" onClick={() => setQDynamic(false)} className={`pill-toggle-btn ${!qDynamic ? 'pill-active-static' : ''}`}>Static</button>
              <button type="button" onClick={() => setQDynamic(true)} className={`pill-toggle-btn ${qDynamic ? 'pill-active-dynamic' : ''}`}>Dynamic</button>
            </div>
            <button onClick={addQuery} className="btn-gradient rounded-xl px-4 py-2.5 text-xs font-semibold">ADD</button>
          </div>
          {queryList.map((q, i) => (
            <div key={i} className={`flex items-center gap-3 text-sm px-4 py-2 rounded-xl transition-all duration-200 ${q.dynamic ? 'kv-row-dynamic' : ''}`} style={{background:'var(--bg-card)', border:'1px solid var(--border-color)'}}>
              <span className="flex-1 font-mono text-xs" style={{color:'var(--text-secondary)'}}>
                {q.key}={q.dynamic ? <span className="text-accent-light font-bold">${q.value}</span> : q.value}
                {q.dynamic && <span className="ml-2 text-accent-light/70 text-[10px] font-semibold">⚡ dynamic</span>}
              </span>
              <button onClick={() => setQueryList(p => p.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-300 text-xs font-medium">✕ Remove</button>
            </div>
          ))}
        </Section>

        {/* CURL INPUT */}
        <Section title="Add Curl Of External Source">
          <textarea
            className="w-full rounded-xl input-dark p-4 font-mono text-xs resize-none"
            rows={4}
            placeholder="Paste curl command here..."
            value={curlInput}
            onChange={e => {
              const val = e.target.value;
              setCurlInput(val);
              const pl = parseCurlToForm(val);
              if (pl) {
                if (pl.method) setMethod(pl.method as HttpMethod);
                if (pl.path) setEndpoint(pl.path);
                if (pl.headers) setHeadersList(pl.headers);
                if (pl.queryParams) setQueryList(pl.queryParams);
                if (pl.contentType) setContentType(pl.contentType);
                if (pl.body) setRequestBody(pl.body);
              }
            }}
            spellCheck={false}
          />
        </Section>

        {/* RESPONSE CONFIG */}
        <Section title="Response Configuration">
          {/* STATUS CODE */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider t-label">Response Status Code</label>
            <select
              className="w-full mt-2 rounded-xl input-dark px-4 py-2.5 text-sm"
              value={statusCode}
              onChange={e => setStatusCode(Number(e.target.value))}
            >
              <option value={200}>200 (Ok)</option>
              <option value={201}>201 (Created)</option>
              <option value={204}>204 (No Content)</option>
              <option value={400}>400 (Bad Request)</option>
              <option value={401}>401 (Unauthorized)</option>
              <option value={403}>403 (Forbidden)</option>
              <option value={404}>404 (Not Found)</option>
              <option value={409}>409 (Conflict)</option>
              <option value={422}>422 (Unprocessable)</option>
              <option value={500}>500 (Server Error)</option>
              <option value={502}>502 (Bad Gateway)</option>
              <option value={503}>503 (Service Unavailable)</option>
            </select>
          </div>

          {/* DELAY */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Delay in Response (ms)</label>
            <input
              type="number"
              min={0}
              className="w-full mt-2 rounded-xl input-dark px-4 py-2.5 text-sm"
              value={delay}
              onChange={e => setDelay(Math.max(0, Number(e.target.value)))}
            />
          </div>
        </Section>

        {/* RESPONSE HEADERS */}
        <Section title="Response Headers">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-1 min-w-[100px]">
              <span className="text-xs t-muted w-[36px]">Key:</span>
              <input className="flex-1 rounded-xl input-dark px-3 py-2.5 text-sm" placeholder="Header name" value={rKey} onChange={e => setRKey(e.target.value)} />
            </div>
            <div className="flex items-center gap-2 flex-1 min-w-[100px]">
              <span className="text-xs t-muted w-[42px]">Value:</span>
              <input className="flex-1 rounded-xl input-dark px-3 py-2.5 text-sm" placeholder="Header value" value={rValue} onChange={e => setRValue(e.target.value)} />
            </div>
            <button onClick={addResponseHeader} className="btn-gradient rounded-xl px-4 py-2.5 text-xs font-semibold">ADD</button>
          </div>
          {responseHeadersList.map((h, i) => (
            <div key={i} className="flex items-center gap-3 text-sm px-4 py-2 rounded-xl" style={{background:'var(--bg-card)', border:'1px solid var(--border-color)'}}>
              <span className="flex-1 font-mono text-xs" style={{color:'var(--text-secondary)'}}>{h.key}: {h.value}</span>
              <button onClick={() => setResponseHeadersList(p => p.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-300 text-xs font-medium">✕ Remove</button>
            </div>
          ))}
        </Section>

        {/* RESPONSE BODY */}
        <Section title="Response Body">
          <textarea
            className="w-full rounded-xl input-dark p-4 font-mono text-sm resize-none overflow-hidden"
            rows={6}
            value={responseBody}
            onChange={e => {
              setResponseBody(e.target.value)
              e.target.style.height = 'auto'
              e.target.style.height = `${e.target.scrollHeight}px`
            }}
            spellCheck={false}
          />
          <div className="text-accent-light/70 text-xs space-y-2">
            <p className="font-semibold">For Dynamic API Response:</p>
            <ul className="list-disc ml-5 space-y-1">
              <li>
                Random generation: <span className="font-mono text-accent-light">$.randomString(4,5)</span>, <span className="font-mono text-accent-light">$.randomInt(1,100)</span>, <span className="font-mono text-accent-light">$.uuid</span>, <span className="font-mono text-accent-light">$.now</span>
              </li>
              <li>
                Request params in response: <span className="font-mono text-accent-light">$.headers.name</span>, <span className="font-mono text-accent-light">$.query.param</span>, <span className="font-mono text-accent-light">$.body.field.nested</span>, <span className="font-mono text-accent-light">$.body.items[0].id</span>
              </li>
            </ul>
          </div>
        </Section>

        {/* TOGGLES */}
        <div className="glass rounded-2xl p-5 flex flex-wrap items-center justify-center gap-8">
          <label className="flex items-center gap-3 cursor-pointer group">
            <div className={`w-10 h-6 rounded-full transition-all duration-200 relative ${toggleResponse ? 'bg-accent' : ''}`}
              style={toggleResponse ? {} : {background:'var(--toggle-off-bg)'}}
              onClick={() => setToggleResponse(r => !r)}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-200 ${toggleResponse ? 'left-5' : 'left-1'}`} />
            </div>
            <span className="text-sm t-secondary group-hover:t-primary transition-colors">Toggle Response</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer group">
            <div className={`w-10 h-6 rounded-full transition-all duration-200 relative ${isTemp ? 'bg-amber-500' : ''}`}
              style={isTemp ? {} : {background:'var(--toggle-off-bg)'}}
              onClick={() => setIsTemp(t => !t)}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-200 ${isTemp ? 'left-5' : 'left-1'}`} />
            </div>
            <div>
              <span className="text-sm t-secondary group-hover:t-primary transition-colors">Temporary Mock</span>
              <p className="text-[10px] t-muted">Gets purged after some interval.</p>
            </div>
          </label>
        </div>

        {/* SUBMIT */}
        <div className="flex justify-center gap-4 pb-10">
          <button
            className="btn-gradient rounded-xl px-10 py-3 text-base font-semibold disabled:opacity-50"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Saving...' : mode === 'edit' ? 'Edit Route' : 'Create API'}
          </button>
          {onCancel && (
            <button
              className="btn-glass rounded-xl px-10 py-3 text-base font-medium"
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </button>
          )}
        </div>

      </div>
    </div>
  )
}

// ── section card helper ──────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass rounded-2xl p-5 space-y-4">
      <h3 className="text-sm font-bold t-heading">{title}</h3>
      {children}
    </div>
  )
}