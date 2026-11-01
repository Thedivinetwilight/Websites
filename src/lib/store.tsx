import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { Prospect, Stage } from './types'
import {
  ApiError,
  addRouteStop,
  fetchBootstrap,
  removeRouteStop,
  reorderRoute,
  resetWorkspace,
  saveAccount,
  updateNote as apiUpdateNote,
  setFollowing as apiSetFollowing,
  setRouteDate as apiSetRouteDate,
  unsaveAccount,
  updateStage as apiUpdateStage,
  type BootstrapPayload,
} from './api'
import { buildDataset, type Dataset, type WorkspaceSnapshot } from './dataset'
import { useToast } from './toast'

export const STAGES: { id: Stage; label: string; hint: string }[] = [
  { id: 'new', label: 'New', hint: 'Not contacted yet' },
  { id: 'contacted', label: 'Contacted', hint: 'First touch made' },
  { id: 'meeting', label: 'Meeting', hint: 'Discovery booked' },
  { id: 'customer', label: 'Customer', hint: 'Signed' },
]

const EMPTY_WORKSPACE: WorkspaceSnapshot = {
  saved: [],
  stages: {},
  notes: {},
  route: [],
  routeDate: '2026-11-03',
  following: [],
  updatedAt: null,
}

export type LoadStatus = 'loading' | 'ready' | 'error'

interface WorkspaceApi {
  /** 'loading' until the first bootstrap request resolves. */
  status: LoadStatus
  error: string | null
  data: Dataset | null
  bootstrap: BootstrapPayload | null
  reload: () => void
  state: WorkspaceSnapshot
  pendingWrites: number
  savedSet: Set<string>
  routeSet: Set<string>
  savedProspects: Prospect[]
  isSaved: (id: string) => boolean
  inRoute: (id: string) => boolean
  stageOf: (id: string) => Stage
  noteOf: (id: string) => string
  toggleSaved: (id: string) => boolean
  addToSaved: (id: string) => void
  removeSaved: (id: string) => void
  setStage: (id: string, stage: Stage) => void
  saveNote: (id: string, note: string) => void
  addStop: (id: string) => void
  removeStop: (id: string) => void
  moveStop: (id: string, dir: -1 | 1) => void
  setRouteOrder: (ids: string[]) => void
  setRouteDate: (date: string) => void
  toggleFollowing: (district: string) => void
  reset: () => void
}

const WorkspaceContext = createContext<WorkspaceApi | null>(null)

function messageOf(error: unknown) {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return 'Something went wrong.'
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const toast = useToast()
  const [status, setStatus] = useState<LoadStatus>('loading')
  const [error, setError] = useState<string | null>(null)
  const [bootstrap, setBootstrap] = useState<BootstrapPayload | null>(null)
  const [state, setState] = useState<WorkspaceSnapshot>(EMPTY_WORKSPACE)
  const [pendingWrites, setPendingWrites] = useState(0)

  const stateRef = useRef(state)
  const seqRef = useRef(0)
  const mountedRef = useRef(true)

  const commit = useCallback((next: WorkspaceSnapshot) => {
    stateRef.current = next
    if (mountedRef.current) setState(next)
  }, [])

  const load = useCallback(async () => {
    setStatus((current) => (current === 'ready' ? 'ready' : 'loading'))
    setError(null)
    try {
      const payload = await fetchBootstrap()
      if (!mountedRef.current) return
      setBootstrap(payload)
      commit(payload.workspace)
      setStatus('ready')
    } catch (err) {
      if (!mountedRef.current) return
      setError(messageOf(err))
      setStatus('error')
    }
  }, [commit])

  useEffect(() => {
    mountedRef.current = true
    void load()
    return () => {
      mountedRef.current = false
    }
  }, [load])

  /**
   * Optimistic write: update the UI immediately, ask the API to persist, then
   * adopt the server's snapshot. On failure, resync from the server so the UI
   * never keeps a change that was not stored.
   */
  const run = useCallback(
    async (next: WorkspaceSnapshot, request: () => Promise<WorkspaceSnapshot>, action: string): Promise<boolean> => {
      const seq = ++seqRef.current
      commit(next)
      setPendingWrites((n) => n + 1)
      try {
        const server = await request()
        if (seq === seqRef.current) commit(server)
        return true
      } catch (err) {
        toast(`Could not ${action}. ${messageOf(err)}`, 'error')
        if (seq === seqRef.current) {
          try {
            const payload = await fetchBootstrap()
            if (seq === seqRef.current) {
              setBootstrap(payload)
              commit(payload.workspace)
            }
          } catch {
            /* the toast already explains that the API is unreachable */
          }
        }
        return false
      } finally {
        if (mountedRef.current) setPendingWrites((n) => Math.max(0, n - 1))
      }
    },
    [commit, toast],
  )

  const data = useMemo<Dataset | null>(() => {
    if (!bootstrap) return null
    return buildDataset(bootstrap.accounts, bootstrap.districts, bootstrap.brief, bootstrap.totals)
  }, [bootstrap])

  const savedSet = useMemo(() => new Set(state.saved), [state.saved])
  const routeSet = useMemo(() => new Set(state.route), [state.route])

  const isSaved = useCallback((id: string) => savedSet.has(id), [savedSet])
  const inRoute = useCallback((id: string) => routeSet.has(id), [routeSet])

  const stageOf = useCallback(
    (id: string) => state.stages[id] ?? data?.byId(id)?.status ?? 'new',
    [state.stages, data],
  )

  const noteOf = useCallback(
    (id: string) => state.notes[id] ?? data?.byId(id)?.notes ?? '',
    [state.notes, data],
  )

  const toggleSaved = useCallback(
    (id: string) => {
      const prev = stateRef.current
      const willSave = !prev.saved.includes(id)
      const next: WorkspaceSnapshot = willSave
        ? { ...prev, saved: [...prev.saved, id] }
        : { ...prev, saved: prev.saved.filter((x) => x !== id), route: prev.route.filter((x) => x !== id) }
      void run(next, () => (willSave ? saveAccount(id) : unsaveAccount(id)), willSave ? 'save the account' : 'remove the account')
      return willSave
    },
    [run],
  )

  const addToSaved = useCallback(
    (id: string) => {
      const prev = stateRef.current
      if (prev.saved.includes(id)) return
      void run({ ...prev, saved: [...prev.saved, id] }, () => saveAccount(id), 'save the account')
    },
    [run],
  )

  const removeSaved = useCallback(
    (id: string) => {
      const prev = stateRef.current
      void run(
        { ...prev, saved: prev.saved.filter((x) => x !== id), route: prev.route.filter((x) => x !== id) },
        () => unsaveAccount(id),
        'remove the account',
      )
    },
    [run],
  )

  const setStage = useCallback(
    (id: string, stage: Stage) => {
      const prev = stateRef.current
      void run(
        { ...prev, stages: { ...prev.stages, [id]: stage } },
        () => apiUpdateStage(id, stage),
        'update the pipeline stage',
      )
    },
    [run],
  )

  const saveNote = useCallback(
    (id: string, note: string) => {
      const prev = stateRef.current
      const notes = { ...prev.notes }
      if (note.trim() === '') delete notes[id]
      else notes[id] = note
      void run({ ...prev, notes }, () => apiUpdateNote(id, note), 'save the note')
    },
    [run],
  )

  const addStop = useCallback(
    (id: string) => {
      const prev = stateRef.current
      const next = {
        ...prev,
        saved: prev.saved.includes(id) ? prev.saved : [...prev.saved, id],
        route: prev.route.includes(id) ? prev.route : [...prev.route, id],
      }
      void run(next, () => addRouteStop(id), 'add the stop')
    },
    [run],
  )

  const removeStop = useCallback(
    (id: string) => {
      const prev = stateRef.current
      void run({ ...prev, route: prev.route.filter((x) => x !== id) }, () => removeRouteStop(id), 'remove the stop')
    },
    [run],
  )

  const setRouteOrder = useCallback(
    (ids: string[]) => {
      const prev = stateRef.current
      void run({ ...prev, route: ids }, () => reorderRoute(ids), 'reorder the route')
    },
    [run],
  )

  const moveStop = useCallback(
    (id: string, dir: -1 | 1) => {
      const prev = stateRef.current
      const idx = prev.route.indexOf(id)
      if (idx < 0) return
      const target = idx + dir
      if (target < 0 || target >= prev.route.length) return
      const next = [...prev.route]
      ;[next[idx], next[target]] = [next[target], next[idx]]
      void run({ ...prev, route: next }, () => reorderRoute(next), 'reorder the route')
    },
    [run],
  )

  const setRouteDate = useCallback(
    (date: string) => {
      const prev = stateRef.current
      void run({ ...prev, routeDate: date }, () => apiSetRouteDate(date), 'change the route date')
    },
    [run],
  )

  const toggleFollowing = useCallback(
    (district: string) => {
      const prev = stateRef.current
      const following = prev.following.includes(district)
        ? prev.following.filter((d) => d !== district)
        : [...prev.following, district]
      void run({ ...prev, following }, () => apiSetFollowing(following), 'update followed districts')
    },
    [run],
  )

  const reset = useCallback(() => {
    const prev = stateRef.current
    void run({ ...prev }, () => resetWorkspace(), 'reset the demo').then((ok) => {
      if (ok) toast('Demo state reset to the seeded workspace', 'info')
    })
  }, [run, toast])

  const savedProspects = useMemo(
    () => state.saved.map((id) => data?.byId(id)).filter(Boolean) as Prospect[],
    [state.saved, data],
  )

  const value: WorkspaceApi = {
    status,
    error,
    data,
    bootstrap,
    reload: () => void load(),
    state,
    pendingWrites,
    savedSet,
    routeSet,
    savedProspects,
    isSaved,
    inRoute,
    stageOf,
    noteOf,
    toggleSaved,
    addToSaved,
    removeSaved,
    setStage,
    saveNote,
    addStop,
    removeStop,
    moveStop,
    setRouteOrder,
    setRouteDate,
    toggleFollowing,
    reset,
  }

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) throw new Error('useWorkspace must be used inside WorkspaceProvider')
  return ctx
}

/** Convenience for pages that only render once the bootstrap has loaded. */
export function useDataset(): Dataset {
  const { data } = useWorkspace()
  if (!data) throw new Error('The demo dataset has not loaded yet')
  return data
}
