import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useRepo } from '../state/RepoContext'
import { PageHeader } from '../components/PageHeader'
import { StatusBanner } from '../components/StatusBanner'
import { Donut } from '../components/Donut'
import { Icon } from '../components/Icon'
import { apiClient } from '../lib/api'
import { niceMax, normalizeHistory } from '../lib/history'
import { LEVEL_CLASS } from '../lib/risk'
import type { MetricKey, ModuleRow } from '../lib/types'

type TabKey = MetricKey | 'score'
// Con datos reales no hay serie de code smells (la BD no los guarda): se ofrece el riesgo promedio.
const REAL_TABS: { key: TabKey; label: string }[] = [
  { key: 'score', label: 'Riesgo promedio' },
  { key: 'complexity', label: 'Complejidad' },
  { key: 'duplication', label: 'Duplicación' },
  { key: 'loc', label: 'Líneas de código' },
  { key: 'churn', label: 'Churn' },
]
const TITLES: Record<TabKey, string> = {
  score: 'Evolución del riesgo promedio',
  complexity: 'Evolución de la complejidad', duplication: 'Evolución de la duplicación', smells: 'Evolución de los code smells',
  loc: 'Evolución de las líneas de código', churn: 'Evolución del churn',
}
const REAL_RANGES = [{ label: 'Últimos 5 análisis', n: 5 }, { label: 'Últimos 10 análisis', n: 10 }, { label: 'Todos', n: 30 }]

function metricOf(m: ModuleRow, k: TabKey): number {
  return k === 'score' ? m.score : k === 'complexity' ? m.cc : k === 'duplication' ? m.scores.duplication : k === 'smells' ? m.deficiencies : k === 'loc' ? m.loc : m.churn
}

export default function Analisis() {
  const { modules, summary: s, isEmpty, repoPath } = useRepo()
  const [metric, setMetric] = useState<TabKey>('complexity')
  const [range, setRange] = useState(1)
  const [hover, setHover] = useState<number | null>(null)

  const real = useQuery({
    queryKey: ['history', repoPath],
    queryFn: async () => normalizeHistory(await apiClient.getHistory(repoPath)),
    enabled: !isEmpty && repoPath.trim() !== '',
    retry: false,
  })
  const TABS = REAL_TABS
  const RANGES = REAL_RANGES
  const tab = TABS.some((t) => t.key === metric) ? metric : TABS[0].key

  const history = useMemo(() => {
    const src: Array<{ label: string } & Partial<Record<TabKey, number>>> = real.data ?? []
    return src.slice(-RANGES[Math.min(range, RANGES.length - 1)].n)
  }, [real.data, range, RANGES])
  const values = history.map((h) => h[tab] ?? 0)
  const yMax = niceMax(values)
  const W = 560, H = 220, PADL = 30, PADR = 10
  const x = (i: number) => PADL + (i * (W - PADL - PADR)) / Math.max(1, history.length - 1)
  const y = (v: number) => H - 8 - (Math.min(yMax, Math.max(0, v)) / yMax) * (H - 16)
  const hasChart = history.length >= 2
  const line = values.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ')
  const area = `${line} L${x(values.length - 1)} ${H - 8} L${x(0)} ${H - 8} Z`
  const hi = Math.min(hover ?? values.length - 1, Math.max(0, values.length - 1))
  const tipPct = hasChart ? (x(hi) / W) * 100 : 50
  const tipStyle = tipPct < 12
    ? { left: '0%', transform: 'translateX(0)' }
    : tipPct > 88
      ? { left: '100%', transform: 'translateX(-100%)' }
      : { left: `${tipPct}%`, transform: 'translateX(-50%)' }

  const top = useMemo(() => [...modules].sort((a, b) => metricOf(b, tab) - metricOf(a, tab)).slice(0, 5), [modules, tab])

  return (
    <>
      <PageHeader
        section="análisis"
        title="Análisis de métricas"
        subtitle="Evolución y comportamiento de las métricas principales del repositorio."
        right={
          <label className="cv-control flex min-h-10 items-center gap-2 px-3 py-2 text-[13px]">
            <Icon name="calendar" size={14} className="text-muted" />
            <span className="sr-only">Periodo</span>
            <select value={range} onChange={(e) => setRange(Number(e.target.value))} className="bg-transparent pr-2 font-medium">
              {RANGES.map((r, i) => <option key={r.label} value={i}>{r.label}</option>)}
            </select>
          </label>
        }
      />
      <StatusBanner />

      <div role="tablist" aria-label="Métrica" className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button key={t.key} role="tab" aria-selected={tab === t.key} onClick={() => setMetric(t.key)} className="cv-chip">
            {t.label}
          </button>
        ))}
      </div>

      <section className="flex flex-col gap-4 lg:flex-row">
        <div className="cv-card lg:flex-[1.9]">
          <h2 className="cv-h2 mb-3">{TITLES[tab]}</h2>
          {!hasChart ? (
            <p role="status" className="cv-empty">
              {real.isPending ? 'Cargando historial…' : real.isError ? 'No se pudo cargar el historial.' : 'Sin datos todavía: se necesitan al menos 2 análisis guardados de este repositorio para ver su evolución.'}
            </p>
          ) : (
          <div>
            <div className="relative min-w-0">
              <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label={`${TITLES[tab]}: de ${values[0]} a ${values[values.length - 1]}`}>
                {[0, 0.25, 0.5, 0.75, 1].map((f) => f * yMax).map((n) => (
                  <g key={n}>
                    <path d={`M${PADL} ${y(n)}H${W}`} style={{ stroke: 'var(--color-line)' }} />
                    <text x="0" y={y(n) + 3.5} fontSize="11" style={{ fill: 'var(--color-muted)' }}>{Math.round(n * 10) / 10}</text>
                  </g>
                ))}
                <path d={area} style={{ fill: 'var(--color-chart-line)', opacity: 0.12 }} />
                <path d={line} fill="none" style={{ stroke: 'var(--color-chart-line)' }} strokeWidth="2.2" strokeLinejoin="round" />
                <path d={`M${x(hi)} 10V${H - 8}`} style={{ stroke: 'var(--color-chart-line)' }} strokeDasharray="3 3" />
                {values.map((v, i) => (
                  <circle key={i} cx={x(i)} cy={y(v)} r={i === hi ? 5.5 : 4} style={{ fill: 'var(--color-chart-line)' }} tabIndex={0} onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} onMouseLeave={() => setHover(null)} onBlur={() => setHover(null)}>
                    <title>{`${history[i].label}: ${v}`}</title>
                  </circle>
                ))}
              </svg>
              <div className="pointer-events-none absolute -top-1 rounded-md bg-ink px-2.5 py-1 text-xs leading-snug text-canvas" style={tipStyle}>
                {history[hi].label}<br />{values[hi]}
              </div>
              <div className="mt-1 flex justify-between text-xs text-muted" style={{ paddingLeft: `${(PADL / W) * 100}%` }} aria-hidden="true">{history.map((h) => <span key={h.label}>{h.label}</span>)}</div>
            </div>
          </div>
          )}
          <p className="mt-3 text-xs text-muted">{'Cada punto es un análisis guardado de este repositorio; el valor es el promedio de sus módulos.'}</p>
        </div>

        <div className="cv-card lg:flex-1">
          <h2 className="cv-h2 mb-4">Distribución actual</h2>
          <div className="flex items-center gap-4">
            <Donut size={112} center={String(s.totalModules)} sub="módulos" slices={[{ value: s.pct.low, color: 'var(--color-risk-low-bar)' }, { value: s.pct.medium, color: 'var(--color-risk-med-bar)' }, { value: s.pct.high, color: 'var(--color-risk-high-bar)' }]} />
            <ul className="flex flex-1 flex-col gap-3 text-[13px]">
              {([['LOW', 'Bajo', s.pct.low], ['MEDIUM', 'Medio', s.pct.medium], ['HIGH', 'Alto', s.pct.high]] as const).map(([l, label, pct]) => (
                <li key={l} className="flex items-center justify-between gap-2"><span className="flex items-center gap-2"><span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${LEVEL_CLASS[l].dot}`} />{label}</span><b className="font-semibold tabular-nums">{pct}%</b></li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="cv-card">
        <h2 className="cv-h2 mb-3">Top módulos por {TABS.find((t) => t.key === tab)!.label.toLowerCase()}</h2>
        <div className="cv-table-wrap">
          <table className="cv-table">
            <thead className="bg-table">
              <tr>
                <th scope="col" className="cv-th cv-sticky-head">Módulo</th>
                <th scope="col" className="cv-th">Complejidad</th>
                <th scope="col" className="cv-th">Cambios</th>
                <th scope="col" className="cv-th">Líneas</th>
                <th className="w-8"><span className="sr-only">Abrir módulo</span></th>
              </tr>
            </thead>
            <tbody>
              {top.length === 0 && <tr><td colSpan={5} className="cv-td py-10 text-center text-muted">Sin datos todavía, ejecuta un análisis.</td></tr>}
              {top.map((m) => (
                <tr key={m.path} className="cv-tr">
                  <td className="cv-sticky cv-td">
                    <Link to={`/modulos?modulo=${encodeURIComponent(m.path)}`} className="flex items-center gap-2 font-mono text-[13px] hover:text-brand">
                      <Icon name="file" size={14} className="shrink-0 text-muted" /><span className="truncate">{m.path}</span>
                    </Link>
                  </td>
                  <td className="cv-td tabular-nums"><span className="flex items-center gap-2"><span aria-hidden="true" className={`h-2.5 w-2.5 rounded-xs ${LEVEL_CLASS[m.level].dot}`} />{m.cc}</span></td>
                  <td className="cv-td tabular-nums">{m.churn}</td>
                  <td className="cv-td tabular-nums">{m.loc.toLocaleString('es-GT')}</td>
                  <td className="cv-td text-soft">
                    <Link to={`/modulos?modulo=${encodeURIComponent(m.path)}`} aria-label={`Ver ${m.path}`} className="flex h-10 w-10 items-center justify-center rounded-lg hover:text-brand">
                      <Icon name="chevR" size={14} strokeWidth={2} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}
