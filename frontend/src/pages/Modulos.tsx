import { memo, useCallback, useDeferredValue, useMemo, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useRepo } from '../state/RepoContext'
import { PageHeader } from '../components/PageHeader'
import { DemoBanner } from '../components/DemoBanner'
import { Icon } from '../components/Icon'
import { RiskPill } from '../components/RiskPill'
import { Pagination } from '../components/Pagination'
import { ModuleDetail } from '../components/ModuleDetail'
import { LEVEL_LABEL } from '../lib/risk'
import type { ModuleRow, RiskLevel } from '../lib/types'
import { useState } from 'react'

const PAGE = 10
type SortKey = 'level' | 'cc' | 'churn' | 'busFactor' | 'deficiencies'
const SORT_KEYS: SortKey[] = ['level', 'cc', 'churn', 'busFactor', 'deficiencies']
const LEVELS: RiskLevel[] = ['HIGH', 'MEDIUM', 'LOW']
const RANK: Record<RiskLevel, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 }

const Row = memo(function Row({ m, onOpen }: { m: ModuleRow; onOpen: (m: ModuleRow, opener: HTMLElement) => void }) {
  return (
    <tr onClick={(e) => onOpen(m, e.currentTarget)} className="cursor-pointer border-t border-[#eef0f7] transition-colors hover:bg-brand-50/60">
      <td className="max-w-[320px] px-3 py-3">
        <button onClick={(e) => { e.stopPropagation(); onOpen(m, e.currentTarget) }} className="flex max-w-full items-center gap-2 text-left">
          <Icon name="file" size={15} className="shrink-0 text-muted" /><span className="truncate">{m.path}</span>
        </button>
      </td>
      <td className="px-3 py-3"><RiskPill level={m.level} /></td>
      <td className="px-3 py-3 tabular-nums">{m.cc}</td>
      <td className="px-3 py-3 tabular-nums">{m.churn}</td>
      <td className="px-3 py-3 tabular-nums">{m.busFactor}</td>
      <td className="px-3 py-3 tabular-nums">{m.deficiencies}</td>
      <td className="px-2 text-soft"><Icon name="chevR" size={16} strokeWidth={2} /></td>
    </tr>
  )
})

export default function Modulos() {
  const { modules } = useRepo()
  const [params, setParams] = useSearchParams()
  const [showFilter, setShowFilter] = useState(false)
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

  const th = (key: SortKey, label: string) => (
    <th scope="col" className="px-3 py-2.5 text-left text-[11px] font-semibold text-soft" aria-sort={sort?.key === key ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}>
      <button onClick={() => patch({ orden: sort?.key === key && sort.dir === -1 ? `${key}:asc` : `${key}:desc`, pagina: null })} className="inline-flex items-center gap-1 hover:text-ink">
        {label}{sort?.key === key && <span aria-hidden="true">{sort.dir === 1 ? '↑' : '↓'}</span>}
      </button>
    </th>
  )

  return (
    <>
      <PageHeader
        section="módulos"
        title="Módulos con mayor riesgo"
        subtitle="Módulos ordenados por nivel de riesgo de mantenibilidad."
        right={
          <div className="relative flex items-center gap-2.5">
            <label className="flex w-44 items-center gap-2 rounded-lg border border-[#e0e4f0] bg-white px-3 py-2.5 text-xs text-muted focus-within:border-brand">
              <Icon name="search" size={14} />
              <span className="sr-only">Buscar módulo</span>
              <input type="search" value={q} onChange={(e) => patch({ q: e.target.value, pagina: null })} placeholder="Buscar módulo..." className="w-full bg-transparent text-ink outline-none placeholder:text-muted" />
            </label>
            <button aria-label="Filtrar por riesgo" aria-expanded={showFilter} onClick={() => setShowFilter(!showFilter)} className={`flex h-10 w-11 items-center justify-center rounded-lg border bg-white ${level !== 'ALL' ? 'border-brand text-brand' : 'border-[#e0e4f0] text-soft'}`}>
              <Icon name="filter" size={16} strokeWidth={2} />
            </button>
            {showFilter && (
              <div className="absolute right-0 top-12 z-10 w-44 rounded-lg border border-line bg-white p-1.5 shadow-lg" onKeyDown={(e) => e.key === 'Escape' && setShowFilter(false)}>
                {(['ALL', ...LEVELS] as const).map((l) => (
                  <button key={l} onClick={() => { patch({ nivel: l === 'ALL' ? null : l, pagina: null }); setShowFilter(false) }} className={`flex w-full items-center justify-between rounded-md px-3 py-2.5 text-xs ${level === l ? 'bg-brand-50 font-semibold text-brand' : 'hover:bg-canvas'}`}>
                    {l === 'ALL' ? 'Todos los niveles' : LEVEL_LABEL[l]}{level === l && <Icon name="check" size={13} strokeWidth={2.4} />}
                  </button>
                ))}
              </div>
            )}
          </div>
        }
      />
      <DemoBanner />

      <section className="rounded-xl border border-line bg-white p-4">
        <div className="overflow-x-auto rounded-lg border border-line">
          <table className="w-full min-w-[640px] border-collapse text-xs">
            <caption className="sr-only">Módulos del repositorio ordenados por riesgo</caption>
            <thead className="bg-[#f7f8fc]">
              <tr>
                <th scope="col" className="px-3 py-2.5 text-left text-[11px] font-semibold text-soft">Módulo</th>
                {th('level', 'Riesgo')}{th('cc', 'CC')}{th('churn', 'Cambios')}{th('busFactor', 'Bus')}{th('deficiencies', 'Deficiencias')}
                <th className="w-8"><span className="sr-only">Abrir</span></th>
              </tr>
            </thead>
            <tbody>
              {slice.map((m) => <Row key={m.path} m={m} onOpen={open} />)}
              {slice.length === 0 && <tr><td colSpan={7} className="px-3 py-10 text-center text-muted">Ningún módulo coincide con la búsqueda.</td></tr>}
            </tbody>
          </table>
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
