import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Stage } from './types'
import { byId, prospects } from './data'

const STORAGE_KEY = 'theru.demo.v4'

export const STAGES: { id: Stage; label: string; hint: string }[] = [
  { id: 'new', label: 'New', hint: 'Not contacted yet' },
  { id: 'contacted', label: 'Contacted', hint: 'First touch made' },
  { id: 'meeting', label: 'Meeting', hint: 'Discovery booked' },
  { id: 'customer', label: 'Customer', hint: 'Signed' },
]

const DEFAULT_STAGES: Record<string, Stage> = {
  'TH-1000': 'meeting',
  'TH-1001': 'contacted',
  'TH-1002': 'meeting',
  'TH-1003': 'new',
  'TH-1004': 'contacted',
  'TH-1005': 'new',
  'TH-1007': 'new',
  'TH-1009': 'contacted',
  'TH-1010': 'contacted',
}

export interface WorkspaceState {
  saved: string[]
  stages: Record<string, Stage>
  notes: Record<string, string>
  route: string[]
  routeDate: string
  following: string[]
}

const initialState: WorkspaceState = {
  saved: ['TH-1000', 'TH-1001', 'TH-1002', 'TH-1003', 'TH-1004', 'TH-1005', 'TH-1007', 'TH-1009', 'TH-1010'],
  stages: DEFAULT_STAGES,
  notes: {
    'TH-1000':
      'Sample sent with the capacity model. Asked for a second visit after the Diwali shipment clears — w/c 9 Nov.',
    'TH-1002':
      'Warehouse lease signed in Sriperumbudur. Fleet expansion is the wedge for a first commercial conversation.',
  },
  route: ['TH-1003', 'TH-1002', 'TH-1009'],
  routeDate: '2026-11-03',
  following: ['Chennai', 'Tiruppur', 'Madurai'],
}

function load(): WorkspaceState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return initialState
    const parsed = JSON.parse(raw) as Partial<WorkspaceState>
    return {
      ...initialState,
      ...parsed,
      stages: { ...DEFAULT_STAGES, ...(parsed.stages || {}) },
      notes: { ...initialState.notes, ...(parsed.notes || {}) },
    }
  } catch {
    return initialState
  }
}

interface WorkspaceApi {
  state: WorkspaceState
  savedSet: Set<string>
  routeSet: Set<string>
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
  setRouteDate: (date: string) => void
  toggleFollowing: (district: string) => void
  reset: () => void
  savedProspects: ReturnType<typeof prospects.filter>
}

const WorkspaceContext = createContext<WorkspaceApi | null>(null)

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WorkspaceState>(() => (typeof window === 'undefined' ? initialState : load()))

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      /* storage can be unavailable in private windows — the demo still works in memory */
    }
  }, [state])

  const savedSet = useMemo(() => new Set(state.saved), [state.saved])
  const routeSet = useMemo(() => new Set(state.route), [state.route])

  const isSaved = useCallback((id: string) => savedSet.has(id), [savedSet])
  const inRoute = useCallback((id: string) => routeSet.has(id), [routeSet])

  const stageOf = useCallback(
    (id: string) => state.stages[id] ?? byId(id)?.status ?? 'new',
    [state.stages],
  )

  const noteOf = useCallback(
    (id: string) => state.notes[id] ?? byId(id)?.notes ?? '',
    [state.notes],
  )

  const toggleSaved = useCallback((id: string) => {
    let added = false
    setState((prev) => {
      const exists = prev.saved.includes(id)
      added = !exists
      return {
        ...prev,
        saved: exists ? prev.saved.filter((x) => x !== id) : [...prev.saved, id],
      }
    })
    return added
  }, [])

  const addToSaved = useCallback((id: string) => {
    setState((prev) => (prev.saved.includes(id) ? prev : { ...prev, saved: [...prev.saved, id] }))
  }, [])

  const removeSaved = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      saved: prev.saved.filter((x) => x !== id),
      route: prev.route.filter((x) => x !== id),
    }))
  }, [])

  const setStage = useCallback((id: string, stage: Stage) => {
    setState((prev) => ({ ...prev, stages: { ...prev.stages, [id]: stage } }))
  }, [])

  const saveNote = useCallback((id: string, note: string) => {
    setState((prev) => ({ ...prev, notes: { ...prev.notes, [id]: note } }))
  }, [])

  const addStop = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      saved: prev.saved.includes(id) ? prev.saved : [...prev.saved, id],
      route: prev.route.includes(id) ? prev.route : [...prev.route, id],
    }))
  }, [])

  const removeStop = useCallback((id: string) => {
    setState((prev) => ({ ...prev, route: prev.route.filter((x) => x !== id) }))
  }, [])

  const moveStop = useCallback((id: string, dir: -1 | 1) => {
    setState((prev) => {
      const idx = prev.route.indexOf(id)
      if (idx < 0) return prev
      const next = [...prev.route]
      const target = idx + dir
      if (target < 0 || target >= next.length) return prev
      ;[next[idx], next[target]] = [next[target], next[idx]]
      return { ...prev, route: next }
    })
  }, [])

  const setRouteDate = useCallback((date: string) => {
    setState((prev) => ({ ...prev, routeDate: date }))
  }, [])

  const toggleFollowing = useCallback((district: string) => {
    setState((prev) => ({
      ...prev,
      following: prev.following.includes(district)
        ? prev.following.filter((d) => d !== district)
        : [...prev.following, district],
    }))
  }, [])

  const reset = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* noop */
    }
    setState(initialState)
  }, [])

  const savedProspects = useMemo(
    () => state.saved.map((id) => byId(id)).filter(Boolean) as typeof prospects,
    [state.saved],
  )

  const value: WorkspaceApi = {
    state,
    savedSet,
    routeSet,
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
    setRouteDate,
    toggleFollowing,
    reset,
    savedProspects,
  }

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) throw new Error('useWorkspace must be used inside WorkspaceProvider')
  return ctx
}
