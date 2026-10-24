import { useCallback, useMemo, useState } from 'react'
import { useRepo } from '../state/RepoContext'
import { PageHeader } from '../components/PageHeader'
import { StatusBanner } from '../components/StatusBanner'
import { Icon } from '../components/Icon'
import { useToast } from '../components/Toast'
import { RiskPill } from '../components/RiskPill'
import { exportCsv, exportPdf, exportXlsx, fileStamp } from '../lib/export'
import { LEVEL_CLASS, LEVEL_LABEL } from '../lib/risk'
import type { ModuleRow, RiskLevel } from '../lib/types'

type Format = 'xlsx' | 'csv' | 'pdf'
type Scope = 'all' | 'top10'
interface Entry { id: string; file: string; when: string; filters: string; fmt: Format; levels: RiskLevel[]; scope: Scope }

const KEY = 'codevitals.reportHistory'
const LEVELS: RiskLevel[] = ['HIGH', 'MEDIUM', 'LOW']

function load(): Entry[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(v) ? v.slice(0, 8) : []
  } catch {
    return []
  }
}

function select(mods: ModuleRow[], levels: RiskLevel[], scope: Scope): ModuleRow[] {
  const f = mods.filter((m) => levels.includes(m.level))
  return scope === 'top10' ? [...f].sort((a, b) => b.score - a.score).slice(0, 10) : f
}

function describe(levels: RiskLevel[], scope: Scope): string {
  const l = levels.length === 3 ? 'Todos los niveles' : levels.map((x) => LEVEL_LABEL[x]).join(', ')
  return `${l} · ${scope === 'top10' ? 'Top 10' : 'Todos los módulos'}`
}

export default function Reportes() {
  const { modules, summary } = useRepo()
  const [levels, setLevels] = useState<RiskLevel[]>(LEVELS)
  const [format, setFormat] = useState<Format>('pdf')
  const [scope, setScope] = useState<Scope>('all')
  const [history, setHistory] = useState<Entry[]>(load)
  const [busy, setBusy] = useState(false)
  const [q, setQ] = useState('')
  const toast = useToast()

  const picked = useMemo(() => select(modules, levels, scope).filter((m) => m.path.toLowerCase().includes(q.trim().toLowerCase())), [modules, levels, scope, q])
  const avg = picked.length ? Math.round(picked.reduce((a, m) => a + m.score, 0) / picked.length) : 0
  const high = picked.filter((m) => m.level === 'HIGH').length
  const defs = picked.reduce((a, m) => a + m.deficiencies, 0)

  const run = async (mods: ModuleRow[], fmt: Format): Promise<string> => (fmt === 'csv' ? exportCsv(mods, summary.name) : fmt === 'pdf' ? exportPdf(mods, summary.name) : exportXlsx(mods, summary.name))

  async function generate() {
    if (picked.length === 0) {
      toast.push('error', 'No hay módulos con los filtros elegidos. Selecciona al menos un nivel de riesgo.')
      return
    }
    setBusy(true)
    try {
      const file = await run(picked, format)
      const entry: Entry = { id: crypto.randomUUID(), file, when: new Date().toLocaleString('es-GT', { dateStyle: 'short', timeStyle: 'short' }), filters: describe(levels, scope), fmt: format, levels, scope }
      const next = [entry, ...history].slice(0, 8)
      setHistory(next)
      try { localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* sin almacenamiento */ }
      toast.push('success', `Reporte generado: ${file}`)
    } catch {
      toast.push('error', 'No se pudo exportar el reporte. Intenta de nuevo o usa el otro formato.')
    } finally {
      setBusy(false)
    }
  }

  const toggle = useCallback((l: RiskLevel) => setLevels((cur) => (cur.includes(l) ? cur.filter((x) => x !== l) : [...cur, l])), [])

  return (
    <>
      <PageHeader section="reportes" title="Reportes" subtitle="Genera un informe del estado de mantenibilidad del repositorio, con las deficiencias de cada módulo." />
      <StatusBanner />

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <section className="cv-card flex flex-col gap-4 lg:w-[300px] lg:shrink-0">
          <h2 className="cv-h2">Configurar reporte</h2>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="rep-q" className="text-xs font-semibold text-soft">Buscar módulo</label>
            <div className="cv-control flex h-10 items-center gap-2 px-3 focus-within:shadow-[0_0_0_3px_var(--color-brand-50)]">
              <Icon name="search" size={16} className="shrink-0 text-muted" />
              <input id="rep-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nombre o ruta…" spellCheck={false} className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted" />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="alcance" className="text-xs font-semibold text-soft">Contenido</label>
            <select id="alcance" value={scope} onChange={(e) => setScope(e.target.value as Scope)} className="cv-control h-10 px-3 text-sm">
              <option value="all">Módulos por riesgo (todos)</option>
              <option value="top10">Top 10 por puntaje</option>
            </select>
          </div>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-xs font-semibold text-soft">Niveles de riesgo</legend>
            {LEVELS.map((l) => (
              <label key={l} className="flex cursor-pointer items-center gap-2.5 text-xs">
                <input type="checkbox" checked={levels.includes(l)} onChange={() => toggle(l)} className="h-4 w-4 accent-brand" />
                <span aria-hidden="true" className={`h-2 w-2 rounded-full ${LEVEL_CLASS[l].dot}`} />{LEVEL_LABEL[l]}
              </label>
            ))}
          </fieldset>
          <fieldset>
            <legend className="mb-2 text-xs font-semibold text-soft">Formato</legend>
            <div className="grid grid-cols-1 gap-2">
              {([['pdf', 'Informe (PDF)', 'Para leer o entregar'], ['xlsx', 'Excel (.xlsx)', 'Resumen, módulos y deficiencias'], ['csv', 'CSV (.csv)', 'Datos planos']] as const).map(([v, label, hint]) => (
                <label key={v} className={`cursor-pointer rounded-lg border px-3 py-2.5 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand text-xs ${format === v ? 'border-brand bg-brand-50 text-brand' : 'border-line text-soft'}`}>
                  <input type="radio" name="formato" value={v} checked={format === v} onChange={() => setFormat(v)} className="sr-only" />
                  <span className="block font-semibold">{label}</span><span className="block text-xs font-normal text-muted">{hint}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <button onClick={() => void generate()} disabled={busy} className="cv-btn-primary w-full">
            <Icon name="download" size={14} strokeWidth={2.2} />{busy ? 'Generando…' : 'Generar reporte'}
          </button>
        </section>

        <section className="flex min-w-0 flex-1 flex-col gap-6">
          <div className="cv-card grid grid-cols-2 gap-6 sm:grid-cols-4">
            {[['Módulos en el reporte', String(picked.length), 'text-ink'], ['Alto riesgo', String(high), 'text-risk-high-fg'], ['Riesgo promedio', String(avg), 'text-risk-med-fg'], ['Deficiencias', String(defs), 'text-ink']].map(([l, v, c]) => (
              <div key={l}><div className="text-xs text-soft">{l}</div><div className={`mt-0.5 text-2xl font-bold tabular-nums ${c}`}>{v}</div></div>
            ))}
          </div>
          <div className="cv-card">
            <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2"><h2 className="cv-h2">Vista previa</h2><span className="text-xs text-muted">{fileStamp(summary.name, format)}</span></div>
            <div className="cv-table-wrap">
              <table className="cv-table min-w-[460px] text-sm">
                <thead className="bg-table"><tr>
                  <th scope="col" className="cv-th cv-sticky-head">Módulo</th>
                  <th scope="col" className="cv-th">Riesgo</th>
                  <th scope="col" className="cv-th text-right" title="Complejidad ciclomática">CC</th>
                  <th scope="col" className="cv-th text-right">Cambios</th>
                  <th scope="col" className="cv-th text-right">Deficiencias</th>
                  <th scope="col" className="cv-th text-right">Puntaje</th>
                </tr></thead>
                <tbody>
                  {picked.slice(0, 6).map((m) => (
                    <tr key={m.path} className="cv-tr">
                      <td className="cv-sticky cv-td max-w-[260px] truncate">{m.path}</td><td className="cv-td"><RiskPill level={m.level} /></td>
                      <td className="cv-td text-right tabular-nums">{m.cc}</td><td className="cv-td text-right tabular-nums">{m.churn}</td><td className="cv-td text-right tabular-nums">{m.deficiencies}</td><td className="cv-td text-right font-semibold tabular-nums">{m.score}</td>
                    </tr>
                  ))}
                  {picked.length === 0 && <tr><td colSpan={6} className="cv-td py-8 text-center text-muted">Selecciona al menos un nivel de riesgo para ver la vista previa.</td></tr>}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-muted">Mostrando {Math.min(6, picked.length)} de {picked.length} módulos incluidos en el reporte.</p>
          </div>
        </section>
      </div>

      <section className="cv-card">
        <h2 className="mb-2 cv-h2">Reportes recientes</h2>
        {history.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted">Aún no has generado reportes. Configura uno y pulsa Generar reporte.</p>
        ) : (
          <div className="cv-table-wrap">
            <table className="cv-table min-w-[560px] text-sm">
              <thead className="bg-table"><tr>
                <th scope="col" className="cv-th cv-sticky-head">Archivo</th>
                <th scope="col" className="cv-th">Generado</th>
                <th scope="col" className="cv-th">Filtros</th>
                <th scope="col" className="cv-th">Formato</th>
                <th className="w-10"><span className="sr-only">Descargar</span></th>
              </tr></thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id} className="cv-tr">
                    <td className="cv-sticky cv-td max-w-[240px] truncate">{h.file}</td><td className="cv-td text-soft">{h.when}</td><td className="cv-td text-soft">{h.filters}</td>
                    <td className="cv-td"><span className="rounded-md bg-brand-50 px-2 py-0.5 font-semibold text-brand">{h.fmt.toUpperCase()}</span></td>
                    <td><button aria-label={`Descargar de nuevo ${h.file}`} title="Vuelve a generar el archivo con los datos actuales" onClick={() => void run(select(modules, h.levels, h.scope), h.fmt).then((f) => toast.push('success', `Descargado de nuevo: ${f}`), () => toast.push('error', 'No se pudo generar el archivo.'))} className="flex h-10 w-10 items-center justify-center rounded-lg text-brand hover:bg-brand-50"><Icon name="download" size={15} strokeWidth={2} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  )
}
