export type Environment = 'DEV' | 'QA' | 'PROD'
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS'

export interface KVRow {
  key: string
  value: string
  dynamic?: boolean
}

export interface MockDto {
  id: string
  projectId: string
  endpoint: string
  method: HttpMethod
  requestBody?: string
  responseBody: any
  statusCode: number
  headers?: Record<string, string>
  queryParams?: Record<string, string>
  responseHeaders?: Record<string, string>
  delayMs?: number
  contentType?: string
  isTemp?: boolean
  toggleResponse?: boolean
  environment: Environment
  testCase?: string
  description?: string
  createdAt?: string
  updatedAt?: string
  createdBy?: string
  updatedBy?: string
}

export interface CreateMockRequest {
  projectId?: string
  endpoint: string
  method: HttpMethod
  testCase?: string
  description?: string
  requestBody?: string
  responseBody: string
  statusCode: number
  contentType?: string
  headersList?: KVRow[]
  queryList?: KVRow[]
  responseHeadersList?: KVRow[]
  headers?: Record<string, string>
  queryParams?: Record<string, string>
  responseHeaders?: Record<string, string>
  delay?: number
  delayMs?: number
  isTemp?: boolean
  toggleResponse?: boolean
  environment?: Environment
}

export interface UpdateMockRequest extends CreateMockRequest {}

export interface LogEntryDto {
  matchedMockId: string
  endpoint: string
  method: string
  timestamp: string
}

export interface ProjectDto {
  id: string
  name: string
}

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'RECOVER' | 'PERMANENT_DELETE'

export interface AuditLogDto {
  id: number
  performedAt: string
  entityType: string
  entityId: string
  action: AuditAction
  actorOlmId?: string | null
  summary?: string | null
  path?: string | null
  requestBody?: string | null
  responseBody?: string | null
  projectName?: string | null
}

export interface SpringPage<T> {
  content: T[]
  totalPages: number
  totalElements: number
  size: number
  number: number
}