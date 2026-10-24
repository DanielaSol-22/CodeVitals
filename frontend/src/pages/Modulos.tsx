import { useCallback, useDeferredValue, useMemo, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useRepo } from '../state/RepoContext'
import { PageHeader } from '../components/PageHeader'
import { StatusBanner } from '../components/StatusBanner'
import { Icon } from '../components/Icon'
import { ModuleCard, GRID } from '../components/ModuleCard'
import { Pagination } from '../components/Pagination'
import { ModuleDetail } from '../components/ModuleDetail'
import { LEVEL_LABEL } from '../lib/risk'
import { exportCsv } from '../lib/export'
import { useToast } from '../components/Toast'
import type { ModuleRow, RiskLevel } from '../lib/types'

const PAGE = 10
type SortKey = 'score' | 'level' | 'cc' | 'churn' | 'busFactor' | 'deficiencies'
const SORT_KEYS: SortKey[] = ['score', 'level', 'cc', 'churn', 'busFactor', 'deficiencies']
const LEVELS: RiskLevel[] = ['HIGH', 'MEDIUM', 'LOW']
const RANK: Record<RiskLevel, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 }

export default function Modulos() {
  const { modules, summary } = useRepo()
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const opener = useRef<HTMLElement | null>(null)

  // Todo el estado de la vista vive en la URL: se puede compartir, recargar y usar el botón Atrás.
  const q = params.get('q') ?? ''
  const levelParam = params.get('nivel')
  const level: RiskLevel | 'ALL' = LEVELS.includes(levelParam as RiskLevel) ? (levelParam as RiskLevel) : 'ALL'
  const [sortKeyRaw, sortDirRaw] = (params.get('orden') ?? '').split(':')
  const sort = SORT_KEYS.includes(sortKeyRaw as SortKey) ? { key: sortKeyRaw as SortKey, dir: sortDirRaw === 'asc' ? (1 as const) : (-1 as const) } : null
  const pageParam = Math.max(1, Number(params.get('pagina')) || 1)
  const selectedPath = params.get('modulo')

  const patch = useCallback(
    (changes: Record<string, string | null>, opts?: { replace?: boolean }) => {
      setParams((prev) => {
        const next = new URLSearchParams(prev)
        for (const [k, v] of Object.entries(changes)) (v === null || v === '') ? next.delete(k) : next.set(k, v)
        return next
      }, { replace: opts?.replace ?? true })
    },
    [setParams],
  )

  const counts = useMemo(() => ({
    HIGH: modules.filter((m) => m.level === 'HIGH').length,
    MEDIUM: modules.filter((m) => m.level === 'MEDIUM').length,
    LOW: modules.filter((m) => m.level === 'LOW').length,
  }), [modules])
  const deferredQ = useDeferredValue(q)
  const rows = useMemo(() => {
    const needle = deferredQ.toLowerCase()
    let r = modules.filter((m) => m.path.toLowerCase().includes(needle) && (level === 'ALL' || m.level === level))
    if (sort) {
      const val = (m: ModuleRow) => (sort.key === 'level' ? RANK[m.level] : m[sort.key])
      r = [...r].sort((a, b) => (val(a) - val(b)) * sort.dir)
    }
    return r
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modules, deferredQ, level, sort?.key, sort?.dir])

  const pages = Math.max(1, Math.ceil(rows.length / PAGE))
  const cur = Math.min(pageParam, pages)
  const slice = rows.slice((cur - 1) * PAGE, cur * PAGE)
  const selected = useMemo(() => modules.find((m) => m.path === selectedPath) ?? null, [modules, selectedPath])

  const open = useCallback((m: ModuleRow, el: HTMLElement) => {
    opener.current = el
    patch({ modulo: m.path }, { replace: false })
  }, [patch])
  const close = useCallback(() => {
    patch({ modulo: null })
    queueMicrotask(() => opener.current?.focus())
  }, [patch])

  const th = (key: SortKey, label: string, hint?: string, right = false) => (
    <div role="columnheader" className={right ? 'lg:text-right' : ''} title={hint} aria-sort={sort?.key === key ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}>
      <button onClick={() => patch({ orden: sort?.key === key && sort.dir === -1 ? `${key}:asc` : `${key}:desc`, pagina: null })} className="inline-flex items-center gap-1 hover:text-ink">
        {label}{sort?.key === key && <span aria-hidden="true">{sort.dir === 1 ? '↑' : '↓'}</span>}
      </button>
    </div>
  )

  return (
    <>
      <PageHeader
        section="módulos"
        title="Módulos con mayor riesgo"
        subtitle="Cada archivo es un módulo. Busca desde la barra de comandos de arriba."
      />
      <StatusBanner />

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar por nivel de riesgo">
          {(['ALL', ...LEVELS] as const).map((l) => {
            const n = l === 'ALL' ? modules.length : counts[l]
            const active = level === l
            return (
              <button key={l} type="button" aria-pressed={active} onClick={() => patch({ nivel: l === 'ALL' ? null : l, pagina: null })}
                className="cv-chip">
                {l === 'ALL' ? 'Todos' : LEVEL_LABEL[l]} <span className="tabular-nums opacity-80">({n})</span>
              </button>
            )
          })}
          <button type="button" disabled={rows.length === 0} onClick={() => toast.push('success', `Se descargó ${exportCsv(rows, summary.name)} con ${rows.length} módulos.`)}
            className="cv-chip ml-auto inline-flex items-center gap-1.5 disabled:opacity-50">
            Exportar CSV ({rows.length})
          </button>
          {(q || level !== 'ALL' || sort) && (
            <button type="button" onClick={() => patch({ q: null, nivel: null, orden: null, pagina: null })} className="min-h-9 px-2 text-[13px] font-semibold text-brand hover:underline">Limpiar filtros</button>
          )}
        </div>
        <div role="table" aria-label="Módulos del repositorio ordenados por riesgo" className="flex flex-col gap-2">
          <div role="rowgroup">
            <div role="row" className={`hidden gap-x-4 px-4 pb-1 text-xs font-medium text-muted lg:grid ${GRID}`}>
              <div role="columnheader">Módulo</div>
              {th('level', 'Riesgo')}{th('score', 'Puntaje', 'Puntaje de riesgo (0-100)', true)}{th('cc', 'CC', 'Complejidad ciclomática')}{th('busFactor', 'Equipo', 'Riesgo por concentración de autores (bus factor)')}{th('churn', 'Cambios', 'Frecuencia de cambios', true)}{th('deficiencies', 'Deficiencias', undefined, true)}
              <div role="columnheader"><span className="sr-only">Abrir</span></div>
            </div>
          </div>
          <div role="rowgroup" className="flex flex-col gap-2">
            {slice.map((m) => <ModuleCard key={m.path} m={m} onOpen={open} />)}
            {slice.length === 0 && <div role="row"><div role="cell" className="cv-empty">Ningún módulo coincide. Prueba con otra búsqueda o limpia los filtros.</div></div>}
          </div>
        </div>
        <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
          <div aria-live="polite">Mostrando {rows.length === 0 ? 0 : (cur - 1) * PAGE + 1} - {Math.min(cur * PAGE, rows.length)} de {rows.length}</div>
          <Pagination page={cur} pages={pages} onPage={(p) => patch({ pagina: p === 1 ? null : String(p) })} />
        </div>
      </section>

      {selected && <ModuleDetail module={selected} onClose={close} />}
    </>
  )
}
