import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRepo } from '../state/RepoContext'
import { PageHeader } from '../components/PageHeader'
import { DemoBanner } from '../components/DemoBanner'
import { Donut } from '../components/Donut'
import { Icon } from '../components/Icon'
import { DEMO_HISTORY } from '../lib/demo'
import { apiClient } from '../lib/api'
import { niceMax, normalizeHistory } from '../lib/history'
import { LEVEL_CLASS } from '../lib/risk'
import type { MetricKey, ModuleRow } from '../lib/types'

type TabKey = MetricKey | 'score'
const DEMO_TABS: { key: TabKey; label: string }[] = [
  { key: 'complexity', label: 'Complejidad' },
  { key: 'duplication', label: 'Duplicación' },
  { key: 'smells', label: 'Code Smells' },
  { key: 'loc', label: 'Líneas de código' },
  { key: 'churn', label: 'Churn' },
]
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
const DEMO_RANGES = [{ label: 'Último mes', n: 3 }, { label: 'Últimos 3 meses', n: 7 }]
const REAL_RANGES = [{ label: 'Últimos 5 análisis', n: 5 }, { label: 'Últimos 10 análisis', n: 10 }, { label: 'Todos', n: 30 }]

function metricOf(m: ModuleRow, k: TabKey): number {
  return k === 'score' ? m.score : k === 'complexity' ? m.cc : k === 'duplication' ? m.scores.duplication : k === 'smells' ? m.deficiencies : k === 'loc' ? m.loc : m.churn
}

export default function Analisis() {
  const { modules, summary: s, isDemo, repoPath } = useRepo()
  const [metric, setMetric] = useState<TabKey>('complexity')
  const [range, setRange] = useState(1)
  const [hover, setHover] = useState<number | null>(null)

  const real = useQuery({
    queryKey: ['history', repoPath],
    queryFn: async () => normalizeHistory(await apiClient.getHistory(repoPath)),
    enabled: !isDemo && repoPath.trim() !== '',
    retry: false,
  })
  const TABS = isDemo ? DEMO_TABS : REAL_TABS
  const RANGES = isDemo ? DEMO_RANGES : REAL_RANGES
  const tab = TABS.some((t) => t.key === metric) ? metric : TABS[0].key

  const history = useMemo(() => {
    const src: Array<{ label: string } & Partial<Record<TabKey, number>>> = isDemo ? DEMO_HISTORY : (real.data ?? [])
    return src.slice(-RANGES[Math.min(range, RANGES.length - 1)].n)
  }, [isDemo, real.data, range, RANGES])
  const values = history.map((h) => h[tab] ?? 0)
  const yMax = isDemo ? 100 : niceMax(values)
  const W = 560, H = 220, PADL = 30, PADR = 10
  const x = (i: number) => PADL + (i * (W - PADL - PADR)) / Math.max(1, history.length - 1)
  const y = (v: number) => H - 8 - (Math.min(yMax, Math.max(0, v)) / yMax) * (H - 16)
  const hasChart = history.length >= 2
  const line = values.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ')
  const area = `${line} L${x(values.length - 1)} ${H - 8} L${x(0)} ${H - 8} Z`
  const hi = Math.min(hover ?? values.length - 1, Math.max(0, values.length - 1))

  const top = useMemo(() => [...modules].sort((a, b) => metricOf(b, tab) - metricOf(a, tab)).slice(0, 5), [modules, tab])

  return (
    <>
      <PageHeader
        section="análisis"
        title="Análisis de métricas"
        subtitle="Evolución y comportamiento de las métricas principales del repositorio."
        right={
          <label className="flex items-center gap-3 rounded-lg border border-[#e0e4f0] bg-white px-3 py-2 text-xs">
            <span className="sr-only">Periodo</span>
            <select value={range} onChange={(e) => setRange(Number(e.target.value))} className="bg-transparent pr-2">
              {RANGES.map((r, i) => <option key={r.label} value={i}>{r.label}</option>)}
            </select>
            <Icon name="calendar" size={14} className="text-soft" />
          </label>
        }
      />
      <DemoBanner />

      <div role="tablist" aria-label="Métrica" className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button key={t.key} role="tab" aria-selected={tab === t.key} onClick={() => setMetric(t.key)} className={`rounded-full border px-4 py-2 text-xs font-semibold transition-colors ${tab === t.key ? 'border-brand bg-brand text-white' : 'border-[#e0e4f0] bg-white text-soft hover:bg-brand-50'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <section className="flex flex-col gap-4 lg:flex-row">
        <div className="min-w-0 rounded-xl border border-line bg-white p-4 lg:flex-[1.9]">
          <h2 className="mb-2 text-sm font-bold">{TITLES[tab]}</h2>
          {!isDemo && !hasChart ? (
            <p role="status" className="rounded-lg bg-canvas p-6 text-center text-xs text-muted">
              {real.isPending ? 'Cargando historial…' : real.isError ? 'No se pudo cargar el historial.' : 'Se necesitan al menos 2 análisis guardados de este repositorio para ver su evolución. Vuelve a analizarlo más adelante.'}
            </p>
          ) : (
          <div>
            <div className="relative min-w-0">
              <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label={`${TITLES[tab]}: de ${values[0]} a ${values[values.length - 1]}`}>
                {[0, 0.25, 0.5, 0.75, 1].map((f) => f * yMax).map((n) => (
                  <g key={n}>
                    <path d={`M${PADL} ${y(n)}H${W}`} stroke="#eceef6" />
                    <text x="0" y={y(n) + 3} fontSize="10" fill="#6b7497">{Math.round(n * 10) / 10}</text>
                  </g>
                ))}
                <path d={area} fill="#ece9fd" opacity=".7" />
                <path d={line} fill="none" stroke="#6657e6" strokeWidth="2" strokeLinejoin="round" />
                <path d={`M${x(hi)} 10V${H - 8}`} stroke="#6657e6" strokeDasharray="3 3" />
                {values.map((v, i) => (
                  <circle key={i} cx={x(i)} cy={y(v)} r={i === hi ? 5 : 3.5} fill="#6657e6" tabIndex={0} onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} onMouseLeave={() => setHover(null)} onBlur={() => setHover(null)}>
                    <title>{`${history[i].label}: ${v}`}</title>
                  </circle>
                ))}
              </svg>
              <div className="pointer-events-none absolute -top-1 -translate-x-1/2 rounded-md bg-[#1c2340] px-2.5 py-1 text-[10px] leading-snug text-white" style={{ left: `${(x(hi) / W) * 100}%` }}>
                {history[hi].label}<br />{values[hi]}
              </div>
              <div className="mt-1 flex justify-between text-[10px] text-muted" style={{ paddingLeft: `${(PADL / W) * 100}%` }} aria-hidden="true">{history.map((h) => <span key={h.label}>{h.label}</span>)}</div>
            </div>
          </div>
          )}
          <p className="mt-2 text-[10px] text-muted">{isDemo ? 'Serie de ejemplo (modo demostración).' : 'Cada punto es un análisis guardado de este repositorio; el valor es el promedio de sus módulos.'}</p>
        </div>

        <div className="rounded-xl border border-line bg-white p-4 lg:flex-1">
          <h2 className="mb-3 text-sm font-bold text-risk-low-fg">Distribución actual</h2>
          <div className="flex items-center gap-4">
            <Donut size={112} center={String(s.totalModules)} sub="módulos" slices={[{ value: s.pct.low, color: '#4caf7d' }, { value: s.pct.medium, color: '#fbc558' }, { value: s.pct.high, color: '#f28c8c' }]} />
            <ul className="flex flex-1 flex-col gap-3 text-xs">
              <li className="flex justify-between"><span><span className="text-risk-low-bar">●</span> Bajo</span><b className="font-semibold">{s.pct.low}%</b></li>
              <li className="flex justify-between"><span><span className="text-risk-med">●</span> Medio</span><b className="font-semibold">{s.pct.medium}%</b></li>
              <li className="flex justify-between"><span><span className="text-risk-high">●</span> Alto</span><b className="font-semibold">{s.pct.high}%</b></li>
            </ul>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-line bg-white p-4">
        <h2 className="mb-3 text-sm font-bold">Top módulos por {TABS.find((t) => t.key === tab)!.label.toLowerCase()}</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-xs">
            <thead className="bg-[#f7f8fc] text-left text-[11px] font-semibold text-soft">
              <tr><th scope="col" className="px-3 py-2.5">Módulo</th><th scope="col" className="px-3 py-2.5">Complejidad</th><th scope="col" className="px-3 py-2.5">Cambios</th><th scope="col" className="px-3 py-2.5">Líneas</th><th className="w-8" /></tr>
            </thead>
            <tbody>
              {top.map((m) => (
                <tr key={m.path} className="border-b border-[#eef0f7]">
                  <td className="px-3 py-3"><span className="flex items-center gap-2"><Icon name="file" size={14} className="text-muted" />{m.path}</span></td>
                  <td className="px-3 py-3 tabular-nums"><span className="flex items-center gap-2"><span aria-hidden="true" className={`h-2 w-2 rounded-xs ${LEVEL_CLASS[m.level].dot}`} />{m.cc}</span></td>
                  <td className="px-3 py-3 tabular-nums">{m.churn}</td>
                  <td className="px-3 py-3 tabular-nums">{m.loc.toLocaleString('es-GT')}</td>
                  <td className="px-2 text-soft"><Icon name="chevR" size={14} strokeWidth={2} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}
