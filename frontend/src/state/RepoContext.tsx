import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ModuleRow, RepoSummary } from '../lib/types'
import { apiClient, errorMessage } from '../lib/api'
import { normalizePriority, normalizeRepo } from '../lib/normalize'
import { DEMO_MODULES, DEMO_SUMMARY } from '../lib/demo'

type Status = 'idle' | 'loading' | 'ready' | 'error'

interface RepoState {
  repoPath: string
  setRepoPath: (p: string) => void
  summary: RepoSummary
  modules: ModuleRow[]
  isDemo: boolean
  status: Status
  error: string | null
  apiOnline: boolean | null
  recent: string[]
  analyze: (path?: string) => Promise<void>
  loadDemo: () => void
}

interface RepoData {
  summary: RepoSummary
  modules: ModuleRow[]
}

const Ctx = createContext<RepoState | null>(null)
const RECENT_KEY = 'codevitals.recentRepos'

function readRecent(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]')
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(0, 5) : []
  } catch {
    return []
  }
}

async function fetchRepo(path: string): Promise<RepoData> {
  const [repoRaw, prioRaw] = await Promise.all([apiClient.analyzeRepositoryRisk(path), apiClient.getPriorityList(path)])
  const summary = normalizeRepo(repoRaw, path)
  let modules = normalizePriority(prioRaw)
  if (modules.length === 0) modules = normalizePriority(repoRaw)
  // /risk/priority no trae CC, churn ni bus factor: se completan con top_risk_modules de /risk/repository.
  const detail = new Map(normalizePriority(repoRaw).map((m) => [m.path, m]))
  modules = modules.map((m) => {
    const d = detail.get(m.path)
    return d ? { ...m, cc: d.cc, churn: d.churn, busFactor: d.busFactor, actions: m.actions.length ? m.actions : d.actions } : m
  })
  if (summary.totalModules === 0) summary.totalModules = modules.length
  // Si la API no entrega promedios por componente, se calculan con los módulos recibidos.
  const ca = summary.componentAvg
  if (modules.length > 0 && Object.values(ca).every((v) => v === 0)) {
    const avg = (pick: (m: ModuleRow) => number) => Math.round(modules.reduce((a, m) => a + pick(m), 0) / modules.length)
    summary.componentAvg = {
      complexity: avg((m) => m.scores.complexity), churn: avg((m) => m.scores.churn), loc: avg((m) => m.scores.loc),
      duplication: avg((m) => m.scores.duplication), busFactor: avg((m) => m.scores.busFactor),
    }
  }
  if (summary.busFactorAvg === 0 && modules.length > 0) summary.busFactorAvg = Math.round(modules.reduce((a, m) => a + m.busFactor, 0) / modules.length)
  return { summary, modules }
}

export function RepoProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient()
  const [repoPath, setRepoPath] = useState(() => readRecent()[0] ?? '')
  const [activePath, setActivePath] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [recent, setRecent] = useState<string[]>(readRecent)

  const health = useQuery({ queryKey: ['health'], queryFn: apiClient.getHealth, refetchInterval: 30_000, staleTime: 15_000 })

  const repo = useQuery({
    queryKey: ['repo', activePath],
    queryFn: () => fetchRepo(activePath as string),
    enabled: activePath !== null,
    retry: false,
    staleTime: 5 * 60_000,
    placeholderData: keepPreviousData,
  })

  // Guarda la ruta como reciente solo cuando el análisis termina bien.
  useEffect(() => {
    if (!repo.isSuccess || activePath === null || repo.isPlaceholderData) return
    setRecent((prev) => {
      const next = [activePath, ...prev.filter((r) => r !== activePath)].slice(0, 5)
      try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(next))
      } catch {
        /* almacenamiento no disponible */
      }
      return next
    })
  }, [repo.isSuccess, repo.isPlaceholderData, activePath])

  const analyze = useCallback(
    async (path?: string) => {
      const target = (path ?? repoPath).trim()
      if (!target) {
        setFormError('Escribe la URL de un repositorio para analizarlo.')
        return
      }
      setFormError(null)
      setRepoPath(target)
      if (target === activePath) await qc.invalidateQueries({ queryKey: ['repo', target] })
      else setActivePath(target)
    },
    [repoPath, activePath, qc],
  )

  const loadDemo = useCallback(() => {
    setActivePath(null)
    setFormError(null)
  }, [])

  const data = activePath !== null ? repo.data : undefined
  const status: Status = formError || (activePath !== null && repo.isError)
    ? 'error'
    : activePath !== null && repo.isFetching
      ? 'loading'
      : activePath !== null && repo.isSuccess
        ? 'ready'
        : 'idle'

  const value = useMemo<RepoState>(
    () => ({
      repoPath,
      setRepoPath,
      summary: data?.summary ?? DEMO_SUMMARY,
      modules: data?.modules ?? DEMO_MODULES,
      isDemo: data === undefined,
      status,
      error: formError ?? (repo.isError ? errorMessage(repo.error) : null),
      apiOnline: health.data ?? (health.isError ? false : null),
      recent,
      analyze,
      loadDemo,
    }),
    [repoPath, data, status, formError, repo.isError, repo.error, health.data, health.isError, recent, analyze, loadDemo],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useRepo(): RepoState {
  const v = useContext(Ctx)
  if (!v) throw new Error('useRepo debe usarse dentro de RepoProvider')
  return v
}
