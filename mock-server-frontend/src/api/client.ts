import axios from 'axios'
import type {
  AuditLogDto,
  CreateMockRequest,
  Environment,
  HttpMethod,
  MockDto,
  ProjectDto,
  SpringPage,
} from '../types'

// ─── config ──────────────────────────────────────────────────────────────────

/**
 * API_BASE_URL resolution:
 *
 * 1. Docker (production):  VITE_API_BASE_URL="" → empty string → relative URLs
 *    nginx proxies /api/*, /routes, /projects, etc. to http://backend:8080
 *
 * 2. Local dev (npm run dev):  VITE_API_BASE_URL not set → empty string
 *    Vite proxy forwards /api/*, /routes, etc. to http://localhost:8080
 *
 * 3. Explicit override: VITE_API_BASE_URL=http://some-host:8080
 */
export const API_BASE_URL =
  (import.meta as any).env?.VITE_API_BASE_URL?.replace(/\/$/, '') ?? ''

const TOKEN_KEY = 'token'
const USER_KEY = 'mockserver.user'

// ─── axios instance ──────────────────────────────────────────────────────────

export const api = axios.create({
  baseURL: API_BASE_URL || undefined,
  timeout: 15000,
})

// ─── auth helpers ─────────────────────────────────────────────────────────────

export function setAuthToken(token: string) {
  window.localStorage.setItem(TOKEN_KEY, token)
}

export function clearAuthToken() {
  window.localStorage.removeItem(TOKEN_KEY)
  window.localStorage.removeItem(USER_KEY)
}

export function getAuthToken(): string | null {
  return window.localStorage.getItem(TOKEN_KEY)
}

export function setUserInfo(user: { userId: string; olmId: string; createdAt: string }) {
  window.localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function getUserInfo(): { userId: string; olmId: string; createdAt: string } | null {
  const raw = window.localStorage.getItem(USER_KEY)
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}

// ─── request interceptor ─────────────────────────────────────────────────────

api.interceptors.request.use((config) => {
  config.headers = config.headers ?? {}

  // Default content-type
  if (!(config.headers as any)['Content-Type']) {
    ;(config.headers as any)['Content-Type'] = 'application/json'
  }

  // Attach JWT only if present (auth is optional / disabled in dev)
  const token = getAuthToken()
  if (token) {
    ;(config.headers as any)['Authorization'] = `Bearer ${token}`
  }

  return config
})

// ─── response interceptor ────────────────────────────────────────────────────

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only redirect to login on 401 if auth is actually enabled
    if (error.response?.status === 401 && getAuthToken()) {
      clearAuthToken()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// ─── auth ─────────────────────────────────────────────────────────────────────

export interface AuthResponse {
  token: string
  userId: string
  olmId: string
  createdAt: string
}

export async function login(payload: {
  olmId: string
  password: string
}): Promise<AuthResponse> {
  const res = await api.post('/auth/login', payload)
  return res.data
}

export async function register(payload: {
  olmId: string
  email: string
  password: string
}): Promise<AuthResponse> {
  const res = await api.post('/auth/register', payload)
  return res.data
}

// ─── mocks / routes ───────────────────────────────────────────────────────────

export async function listMocks(): Promise<MockDto[]> {
  const res = await api.get('/api/mocks')
  return res.data
}

export async function searchMocks(query: string): Promise<MockDto[]> {
  const res = await api.get('/api/mocks/search', { params: { query } })
  return res.data
}

export async function listProjectMocks(projectId: string): Promise<MockDto[]> {
  const res = await api.get('/routes', { params: { projectId } })
  return res.data
}

export async function createMock(payload: CreateMockRequest): Promise<MockDto> {
  const res = await api.post('/api/mocks', payload)
  return res.data
}

export async function updateMock(
  id: string,
  payload: CreateMockRequest
): Promise<MockDto> {
  const res = await api.put(`/api/mocks/${id}`, payload)
  return res.data
}

export async function deleteMock(id: string): Promise<void> {
  await api.delete(`/api/mocks/${id}`)
}

export async function listTrash(): Promise<MockDto[]> {
  const res = await api.get('/api/mocks/trash')
  return res.data
}

export async function recoverMock(id: string): Promise<void> {
  await api.post(`/api/mocks/${id}/recover`)
}

/**
 * Permanently delete a mock from trash.
 * Archives to PostgreSQL then hard-deletes — data is never fetchable again via API.
 */
export async function permanentlyDeleteMock(id: string): Promise<void> {
  await api.delete(`/api/mocks/${id}/permanent`)
}

export async function importMocks(payload: CreateMockRequest[]): Promise<MockDto[]> {
  const res = await api.post('/api/mocks/import', payload)
  return res.data
}

// ─── projects ────────────────────────────────────────────────────────────────

export async function listProjects(): Promise<ProjectDto[]> {
  const res = await api.get('/projects')
  return res.data
}

export async function createProject(payload: { name: string }): Promise<ProjectDto> {
  const res = await api.post('/projects', payload)
  return res.data
}

export async function deleteProject(projectId: string): Promise<void> {
  await api.delete(`/api/projects/${projectId}`)
}

// ─── audit (CRUD trail) ─────────────────────────────────────────────────────

export async function listAuditLogs(page = 0, size = 20): Promise<SpringPage<AuditLogDto>> {
  const res = await api.get('/api/audit-logs', { params: { page, size } })
  return res.data
}

// ─── migration ────────────────────────────────────────────────────────────────

export async function migrate(payload: {
  fromProjectId: string
  toProjectId: string
}): Promise<MockDto[]> {
  const res = await api.post('/migrate', payload)
  return res.data
}

// ─── test mock endpoint ───────────────────────────────────────────────────────

export async function hitMockEndpoint(params: {
  endpoint: string
  method: HttpMethod
  environment: Environment
  queryParams?: Record<string, string>
  headers?: Record<string, string>
  requestBody?: string
}): Promise<{ status: number; data: any; headers: Record<string, any> }> {
  const endpoint = params.endpoint.startsWith('/')
    ? params.endpoint
    : `/${params.endpoint}`

  // Route through /mock-proxy/ so nginx forwards ALL methods (including GET) to the backend mock engine
  const base = API_BASE_URL || window.location.origin
  const url = new URL(`${base}/mock-proxy${endpoint}`)

  if (params.queryParams) {
    for (const [k, v] of Object.entries(params.queryParams)) {
      if (v != null) url.searchParams.set(k, v)
    }
  }

  const headers: Record<string, string> = {
    // Tell the mock engine which environment to use
    'X-Environment': params.environment,
    ...(params.headers ?? {}),
  }

  const token = getAuthToken()
  if (token) headers['Authorization'] = `Bearer ${token}`

  const data = params.requestBody || undefined
  if (data) {
    headers['Content-Type'] = headers['Content-Type'] ?? 'application/json'
  }

  const res = await api.request({
    url: url.toString(),
    method: params.method,
    headers,
    data,
    validateStatus: () => true, // don't throw on 4xx/5xx — show the actual response
  })

  return {
    status: res.status,
    data: res.data,
    headers: res.headers as Record<string, any>,
  }
}