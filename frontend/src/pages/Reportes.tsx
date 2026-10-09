import { useCallback, useMemo, useState } from 'react'
import { useRepo } from '../state/RepoContext'
import { PageHeader } from '../components/PageHeader'
import { DemoBanner } from '../components/DemoBanner'
import { Icon } from '../components/Icon'
import { useToast } from '../components/Toast'
import { RiskPill } from '../components/RiskPill'
import { exportCsv, exportXlsx, fileStamp } from '../lib/export'
import { LEVEL_CLASS, LEVEL_LABEL } from '../lib/risk'
import type { ModuleRow, RiskLevel } from '../lib/types'

type Format = 'xlsx' | 'csv'
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
  const [format, setFormat] = useState<Format>('xlsx')
  const [scope, setScope] = useState<Scope>('all')
  const [history, setHistory] = useState<Entry[]>(load)
  const [busy, setBusy] = useState(false)
  const toast = useToast()

  const picked = useMemo(() => select(modules, levels, scope), [modules, levels, scope])
  const avg = picked.length ? Math.round(picked.reduce((a, m) => a + m.score, 0) / picked.length) : 0
  const high = picked.filter((m) => m.level === 'HIGH').length

  const run = async (mods: ModuleRow[], fmt: Format): Promise<string> => (fmt === 'csv' ? exportCsv(mods, summary.name) : exportXlsx(mods, summary.name))

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
      <PageHeader section="reportes" title="Reportes" subtitle="Genera y exporta el estado de mantenibilidad del repositorio en CSV o Excel." />
      <DemoBanner />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <section className="flex flex-col gap-4 rounded-xl border border-line bg-white p-4 lg:w-[260px] lg:shrink-0">
          <h2 className="text-sm font-bold">Configurar reporte</h2>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="alcance" className="text-[11px] font-semibold text-soft">Contenido</label>
            <select id="alcance" value={scope} onChange={(e) => setScope(e.target.value as Scope)} className="rounded-lg border border-[#e0e4f0] bg-white px-2.5 py-2.5 text-xs">
              <option value="all">Módulos por riesgo (todos)</option>
              <option value="top10">Top 10 por puntaje</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="periodo" className="text-[11px] font-semibold text-soft">Periodo</label>
            <select id="periodo" disabled title="Disponible cuando la API entregue historial por fecha" className="rounded-lg border border-[#e0e4f0] bg-canvas px-2.5 py-2.5 text-xs text-muted">
              <option>Estado actual</option>
            </select>
          </div>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-[11px] font-semibold text-soft">Niveles de riesgo</legend>
            {LEVELS.map((l) => (
              <label key={l} className="flex cursor-pointer items-center gap-2.5 text-xs">
                <input type="checkbox" checked={levels.includes(l)} onChange={() => toggle(l)} className="h-4 w-4 accent-brand" />
                <span aria-hidden="true" className={`h-2 w-2 rounded-full ${LEVEL_CLASS[l].dot}`} />{LEVEL_LABEL[l]}
              </label>
            ))}
          </fieldset>
          <fieldset>
            <legend className="mb-2 text-[11px] font-semibold text-soft">Formato</legend>
            <div className="grid grid-cols-2 gap-2">
              {([['xlsx', 'Excel (.xlsx)'], ['csv', 'CSV (.csv)']] as const).map(([v, label]) => (
                <label key={v} className={`cursor-pointer rounded-lg border px-2 py-2.5 text-center text-[11px] font-semibold ${format === v ? 'border-brand bg-brand-50 text-brand' : 'border-[#e0e4f0] text-soft'}`}>
                  <input type="radio" name="formato" value={v} checked={format === v} onChange={() => setFormat(v)} className="sr-only" />{label}
                </label>
              ))}
            </div>
          </fieldset>
          <button onClick={() => void generate()} disabled={busy} className="flex items-center justify-center gap-2 rounded-lg bg-brand px-3 py-3 text-xs font-semibold text-white hover:bg-[#4338ca] disabled:opacity-60">
            <Icon name="download" size={14} strokeWidth={2.2} />{busy ? 'Generando…' : 'Generar reporte'}
          </button>
        </section>

        <section className="flex min-w-0 flex-1 flex-col gap-4">
          <div className="grid grid-cols-3 gap-3">
            {[['Módulos en el reporte', String(picked.length), 'text-ink'], ['Alto riesgo', String(high), 'text-risk-high-fg'], ['Riesgo promedio', String(avg), 'text-risk-med-fg']].map(([l, v, c]) => (
              <div key={l} className="rounded-xl border border-line bg-white px-3.5 py-3"><div className="text-[11px] text-soft">{l}</div><div className={`mt-0.5 text-2xl font-bold ${c}`}>{v}</div></div>
            ))}
          </div>
          <div className="rounded-xl border border-line bg-white p-4">
            <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2"><h2 className="text-sm font-bold">Vista previa</h2><span className="text-[11px] text-muted">{fileStamp(summary.name, format)}</span></div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[460px] border-collapse text-[11px]">
                <thead className="bg-[#f7f8fc] text-left font-semibold text-soft"><tr><th scope="col" className="px-2 py-2">Módulo</th><th scope="col" className="px-2 py-2">Riesgo</th><th scope="col" className="px-2 py-2">CC</th><th scope="col" className="px-2 py-2">Churn</th><th scope="col" className="px-2 py-2">Puntaje</th></tr></thead>
                <tbody>
                  {picked.slice(0, 6).map((m) => (
                    <tr key={m.path} className="border-b border-[#eef0f7]">
                      <td className="max-w-[260px] truncate px-2 py-2.5">{m.path}</td><td className="px-2 py-2.5"><RiskPill level={m.level} /></td>
                      <td className="px-2 py-2.5 tabular-nums">{m.cc}</td><td className="px-2 py-2.5 tabular-nums">{m.churn}</td><td className="px-2 py-2.5 font-semibold tabular-nums">{m.score}</td>
                    </tr>
                  ))}
                  {picked.length === 0 && <tr><td colSpan={5} className="px-2 py-8 text-center text-muted">Selecciona al menos un nivel de riesgo para ver la vista previa.</td></tr>}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-[11px] text-muted">Mostrando {Math.min(6, picked.length)} de {picked.length} módulos incluidos en el reporte.</p>
          </div>
        </section>
      </div>

      <section className="rounded-xl border border-line bg-white p-4">
        <h2 className="mb-2 text-sm font-bold">Reportes recientes</h2>
        {history.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted">Aún no has generado reportes. Configura uno y pulsa Generar reporte.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-[11px]">
              <thead className="bg-[#f7f8fc] text-left font-semibold text-soft"><tr><th scope="col" className="px-2 py-2">Archivo</th><th scope="col" className="px-2 py-2">Generado</th><th scope="col" className="px-2 py-2">Filtros</th><th scope="col" className="px-2 py-2">Formato</th><th className="w-10"><span className="sr-only">Descargar</span></th></tr></thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id} className="border-b border-[#eef0f7]">
                    <td className="max-w-[240px] truncate px-2 py-3">{h.file}</td><td className="px-2 py-3 text-soft">{h.when}</td><td className="px-2 py-3 text-soft">{h.filters}</td>
                    <td className="px-2 py-3"><span className="rounded-md bg-brand-50 px-2 py-0.5 font-semibold text-brand">{h.fmt.toUpperCase()}</span></td>
                    <td><button aria-label={`Descargar de nuevo ${h.file}`} title="Vuelve a generar el archivo con los datos actuales" onClick={() => void run(select(modules, h.levels, h.scope), h.fmt).then((f) => toast.push('success', `Descargado de nuevo: ${f}`), () => toast.push('error', 'No se pudo generar el archivo.'))} className="flex h-9 w-9 items-center justify-center text-brand"><Icon name="download" size={15} strokeWidth={2} /></button></td>
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
