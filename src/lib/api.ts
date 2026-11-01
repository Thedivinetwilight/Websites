import type { DistrictMeta, Prospect, Stage } from './types'
import type { Totals, WorkspaceSnapshot } from './dataset'

/**
 * Thin, typed client for the local demo API. Requests are relative so the app
 * works in the Vite dev server (proxy) and from the production server, which
 * serves the built files and the API on the same origin.
 */

export class ApiError extends Error {
  status: number
  code: string
  details?: unknown

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

const NETWORK_MESSAGE =
  'The demo API is not reachable. Start it with “npm run dev” (or “npm start” after a build) and try again.'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(`/api${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    })
  } catch {
    throw new ApiError(0, 'network_error', NETWORK_MESSAGE)
  }

  const body = (await res.json().catch(() => null)) as
    | { data?: T; error?: { code?: string; message?: string; details?: unknown }; page?: unknown }
    | null

  if (!res.ok) {
    throw new ApiError(
      res.status,
      body?.error?.code ?? 'request_failed',
      body?.error?.message ?? `Request failed with status ${res.status}.`,
      body?.error?.details,
    )
  }
  if (!body) throw new ApiError(res.status, 'invalid_response', 'The API returned an empty response.')
  return body as T
}

export interface BootstrapPayload {
  meta: {
    datasetVersion: string
    schemaVersion: number
    seededAt: string
    source: string
    demo: true
  }
  totals: Totals
  districts: DistrictMeta[]
  accounts: Prospect[]
  brief: Prospect[]
  workspace: WorkspaceSnapshot
}

export interface AccountQuery {
  q?: string
  district?: string
  sector?: string
  region?: string
  stage?: Stage | 'all'
  saved?: boolean
  sort?: 'score' | 'signals' | 'potential' | 'momentum' | 'name' | 'fit'
  limit?: number
  offset?: number
}

export interface AccountPage {
  data: Prospect[]
  page: { limit: number; offset: number; total: number; returned: number; hasMore: boolean }
  summary: { potentialL: number; strongMomentum: number }
}

function queryString(params: Record<string, string | number | boolean | undefined>) {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === '' || value === false) return
    search.set(key, value === true ? '1' : String(value))
  })
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}

export function fetchBootstrap() {
  return request<{ data: BootstrapPayload }>('/bootstrap').then((res) => res.data)
}

export function searchAccounts(query: AccountQuery, signal?: AbortSignal) {
  const qs = queryString({
    q: query.q,
    district: query.district,
    sector: query.sector,
    region: query.region,
    stage: query.stage === 'all' ? undefined : query.stage,
    saved: query.saved ? '1' : undefined,
    sort: query.sort,
    limit: query.limit,
    offset: query.offset,
  })
  return request<AccountPage>(`/accounts${qs}`, { signal })
}

export function fetchAccount(id: string, signal?: AbortSignal) {
  return request<{ data: Prospect }>(`/accounts/${encodeURIComponent(id)}`, { signal }).then((r) => r.data)
}

export function fetchDistricts() {
  return request<{ data: DistrictMeta[] }>('/districts').then((r) => r.data)
}

export function fetchDistrict(slug: string) {
  return request<{ data: { district: DistrictMeta; accounts: Prospect[]; nearby: DistrictMeta[] } }>(
    `/districts/${encodeURIComponent(slug)}`,
  ).then((r) => r.data)
}

const unwrapWorkspace = (res: { data: { workspace: WorkspaceSnapshot } }) => res.data.workspace

export function saveAccount(accountId: string) {
  return request<{ data: { workspace: WorkspaceSnapshot } }>('/workspace/saved', {
    method: 'POST',
    body: JSON.stringify({ accountId }),
  }).then(unwrapWorkspace)
}

export function unsaveAccount(accountId: string) {
  return request<{ data: { workspace: WorkspaceSnapshot } }>(
    `/workspace/saved/${encodeURIComponent(accountId)}`,
    { method: 'DELETE' },
  ).then(unwrapWorkspace)
}

export function updateStage(accountId: string, stage: Stage) {
  return request<{ data: { workspace: WorkspaceSnapshot } }>(
    `/workspace/pipeline/${encodeURIComponent(accountId)}`,
    { method: 'PATCH', body: JSON.stringify({ stage }) },
  ).then(unwrapWorkspace)
}

export function updateNote(accountId: string, note: string) {
  return request<{ data: { workspace: WorkspaceSnapshot } }>(
    `/workspace/notes/${encodeURIComponent(accountId)}`,
    { method: 'PUT', body: JSON.stringify({ note }) },
  ).then(unwrapWorkspace)
}

export function addRouteStop(accountId: string) {
  return request<{ data: { workspace: WorkspaceSnapshot } }>('/workspace/route/stops', {
    method: 'POST',
    body: JSON.stringify({ accountId }),
  }).then(unwrapWorkspace)
}

export function removeRouteStop(accountId: string) {
  return request<{ data: { workspace: WorkspaceSnapshot } }>(
    `/workspace/route/stops/${encodeURIComponent(accountId)}`,
    { method: 'DELETE' },
  ).then(unwrapWorkspace)
}

export function reorderRoute(stops: string[]) {
  return request<{ data: { workspace: WorkspaceSnapshot } }>('/workspace/route/order', {
    method: 'PATCH',
    body: JSON.stringify({ stops }),
  }).then(unwrapWorkspace)
}

export function setRouteDate(date: string) {
  return request<{ data: { workspace: WorkspaceSnapshot } }>('/workspace/route/date', {
    method: 'PATCH',
    body: JSON.stringify({ date }),
  }).then(unwrapWorkspace)
}

export function setFollowing(districts: string[]) {
  return request<{ data: { workspace: WorkspaceSnapshot } }>('/workspace/following', {
    method: 'PUT',
    body: JSON.stringify({ districts }),
  }).then(unwrapWorkspace)
}

export function resetWorkspace() {
  return request<{ data: { workspace: WorkspaceSnapshot } }>('/workspace/reset', { method: 'POST' }).then(
    unwrapWorkspace,
  )
}
