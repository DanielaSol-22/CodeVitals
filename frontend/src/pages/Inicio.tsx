import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useRepo } from '../state/RepoContext'
import { PageHeader } from '../components/PageHeader'
import { StatusBanner } from '../components/StatusBanner'
import { RiskMap } from '../components/RiskMap'
import { KpiCard } from '../components/KPICard'
import { Icon } from '../components/Icon'
import { useToast } from '../components/Toast'
import { apiClient } from '../lib/api'
import { exportCsv } from '../lib/export'
import { normalizeHistory } from '../lib/history'
import { trendOf } from '../lib/trend'
import { FACTOR_COLOR, FACTOR_LABEL, FACTOR_WEIGHT, LEVEL_CLASS, LEVEL_LABEL, levelFromScore, mainFactor, scoreColor, scoreText } from '../lib/risk'
import type { ComponentScores, RiskLevel } from '../lib/types'
import { useMounted } from '../lib/useMounted'

type Tab = 'score' | 'weight' | 'share'
const TABS: { key: Tab; label: string; hint: string }[] = [
  { key: 'score', label: 'Puntajes', hint: 'Puntaje promedio de cada componente (0-100).' },
  { key: 'weight', label: 'Pesos', hint: 'Peso de cada componente en la fórmula, normalizado a 100 %.' },
  { key: 'share', label: 'Aporte', hint: 'Puntos que cada componente suma al puntaje global (puntaje × peso).' },
]
const KEYS = Object.keys(FACTOR_WEIGHT) as (keyof ComponentScores)[]
const BAR_SHORT: Record<keyof ComponentScores, string> = { complexity: 'Complejidad', churn: 'Cambios', loc: 'Líneas', duplication: 'Duplicación', busFactor: 'Bus factor' }
const WSUM = KEYS.reduce((a, k) => a + FACTOR_WEIGHT[k], 0)
const CHART_H = 176

const RANGES = [{ label: 'Últimos 5', n: 5 }, { label: 'Últimos 10', n: 10 }, { label: 'Todos', n: 100 }]

function TrendChart({ points, labels }: { points: number[]; labels: string[] }) {
  const W = 560, H = 140, P = 10
  const lo = Math.min(...points), hi = Math.max(...points)
  const span = hi - lo || 1
  const x = (i: number) => P + (i * (W - 2 * P)) / Math.max(1, points.length - 1)
  const y = (v: number) => H - P - ((v - lo) / span) * (H - 2 * P - 14)
  const line = points.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ')
  const area = `${line} L${x(points.length - 1)} ${H} L${x(0)} ${H} Z`
  const last = points.length - 1
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-[140px] w-full" role="img" aria-label={`Riesgo promedio de ${points[0]} a ${points[last]} en ${points.length} análisis`}>
        <path d={area} style={{ fill: 'var(--color-chart-line)', opacity: 0.12 }} />
        <path d={line} fill="none" style={{ stroke: 'var(--color-chart-line)' }} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r={i === last ? 4.5 : 3.5} style={{ fill: i === last ? 'var(--color-chart-line)' : 'var(--color-surface)', stroke: 'var(--color-chart-line)' }} strokeWidth="2" />)}
      </svg>
      <div className="relative mt-1 h-4 text-xs text-muted" aria-hidden="true">
        {labels.map((l, i) => <span key={i} className="absolute whitespace-nowrap tabular-nums" style={{ left: `${(x(i) / W) * 100}%`, transform: i === 0 ? 'none' : i === last ? 'translateX(-100%)' : 'translateX(-50%)' }}>{i === 0 || i === last || points.length <= 6 ? l : ''}</span>)}
      </div>
      <div className="mt-1 text-right text-xs font-semibold text-ink">Último · {points[last]}</div>
    </div>
  )
}

export default function Inicio() {
  const { summary: s, modules, isEmpty, repoPath, analyze, status } = useRepo()
  const toast = useToast()
  const mounted = useMounted()
  const [tab, setTab] = useState<Tab>('score')
  const [range, setRange] = useState(1)

  const hist = useQuery({
    queryKey: ['history', repoPath],
    queryFn: async () => normalizeHistory(await apiClient.getHistory(repoPath)),
    enabled: !isEmpty && repoPath.trim() !== '',
    retry: false,
  })
  const series = useMemo(() => (hist.data ?? []).slice(-RANGES[range].n), [hist.data, range])
  const trend = useMemo(() => trendOf((hist.data ?? []).map((h) => h.score)), [hist.data])

  const top = useMemo(() => [...modules].sort((a, b) => b.score - a.score).slice(0, 3), [modules])
  const hasComponents = Object.values(s.componentAvg).some((v) => v > 0)
  const level = levelFromScore(s.avgScore)

  const bars = KEYS.map((k) => {
    const score = s.componentAvg[k]
    const value = tab === 'score' ? score : tab === 'weight' ? (FACTOR_WEIGHT[k] / WSUM) * 100 : (score * FACTOR_WEIGHT[k]) / WSUM
    return { key: k, value: Math.round(value * 10) / 10 }
  })
  const yMax = tab === 'score' ? 100 : Math.max(10, Math.ceil(Math.max(...bars.map((b) => b.value)) / 10) * 10)
  const suffix = tab === 'weight' ? ' %' : ''
  const drivers = [...KEYS].sort((a, b) => s.componentAvg[b] * FACTOR_WEIGHT[b] - s.componentAvg[a] * FACTOR_WEIGHT[a]).slice(0, 2)

  const levelWord = level === 'HIGH' ? 'riesgo alto' : level === 'MEDIUM' ? 'riesgo medio' : 'riesgo bajo'
  const advice = level === 'HIGH' ? 'Prioriza de inmediato los módulos de alto riesgo y reduce su deuda técnica.'
    : level === 'MEDIUM' ? 'Se recomienda revisar los módulos de alto riesgo y priorizar la reducción de deuda técnica.'
      : 'Mantén las revisiones periódicas para conservar este nivel.'

  const deltaClass = !trend || trend.direction === 'flat' ? 'text-muted' : trend.direction === 'up' ? 'text-risk-high' : 'text-risk-low'
  const dist: [RiskLevel, number, number][] = [['LOW', s.pct.low, s.counts.low], ['MEDIUM', s.pct.medium, s.counts.medium], ['HIGH', s.pct.high, s.counts.high]]

  return (
    <>
      <PageHeader
        section="panel de diagnóstico"
        title="Estado del repositorio"
        subtitle="Resumen general de la salud del código y métricas de mantenibilidad."
        right={
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" disabled={status === 'loading'} onClick={() => void analyze(repoPath)} className="cv-btn">
              <Icon name="play" size={13} />Correr Análisis
            </button>
            <button type="button" onClick={() => toast.push('success', `Se descargó ${exportCsv(modules, s.name)}`)} className="cv-btn-primary">
              <Icon name="download" size={15} />Exportar CSV
            </button>
          </div>
        }
      />
      <StatusBanner />

      <p className="-mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-soft">
        <span className="inline-flex items-center gap-1.5"><Icon name="calendar" size={14} className="text-muted" />Analizado el <b className="font-semibold text-ink">{s.updatedAt}</b></span>
        <span aria-hidden="true" className="text-line">|</span>
        <span><b className="font-semibold text-ink tabular-nums">{s.totalModules}</b> módulos</span>
        {s.commits !== null && <><span aria-hidden="true" className="text-line">|</span><span><b className="font-semibold text-ink tabular-nums">{s.commits.toLocaleString('es-GT')}</b> commits</span></>}
      </p>

      <section aria-label="Riesgo global" className="cv-card flex flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
          <div className="flex items-end gap-4">
            <span className="font-display text-[5.5rem] font-extrabold leading-[0.85] tabular-nums" style={{ color: scoreText(s.avgScore) }}>{Math.round(s.avgScore)}</span>
            <div className="flex flex-col gap-1.5 pb-1">
              <span className={`inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${LEVEL_CLASS[level].pill}`}>
                <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${LEVEL_CLASS[level].dot}`} />Riesgo global {LEVEL_LABEL[level].toLowerCase()}
              </span>
              <span className="text-[13px]">
                {trend && trend.direction !== 'flat'
                  ? <span className={`font-semibold ${deltaClass}`}>{trend.direction === 'up' ? '↑ +' : '↓ '}{trend.delta} <span className="font-normal text-muted">vs. análisis anterior</span></span>
                  : <span className="text-muted">{trend ? 'Sin cambios vs. análisis anterior' : 'Sin análisis previo para comparar'}</span>}
              </span>
            </div>
          </div>
          <p className="max-w-[44ch] text-sm text-soft">{s.highCount > 0 ? `${s.highCount} ${s.highCount === 1 ? 'módulo requiere' : 'módulos requieren'} atención inmediata.` : 'Ningún módulo está en riesgo alto.'} Cada celda es un módulo, ordenado de mayor a menor puntaje; cuanto más intenso el color, mayor el riesgo.</p>
        </div>
        <RiskMap modules={modules} />
        {s.totalModules > 0 && (
          <div>
            <div className="flex h-2 gap-0.5 overflow-hidden rounded-full" role="img" aria-label={`Bajo ${s.pct.low}%, medio ${s.pct.medium}%, alto ${s.pct.high}%`}>
              {dist.map(([l, pct]) => pct > 0 && <div key={l} style={{ flex: pct, background: LEVEL_CLASS[l].bar }} />)}
            </div>
            <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-soft">
              {dist.map(([l, pct, n]) => <li key={l} className="inline-flex items-center gap-1.5"><span aria-hidden="true" className={`h-2.5 w-2.5 rounded-sm ${LEVEL_CLASS[l].dot}`} />{LEVEL_LABEL[l]} · {pct}% ({n})</li>)}
            </ul>
          </div>
        )}
      </section>

      <section aria-label="Indicadores principales" className="grid grid-cols-2 gap-6 lg:grid-cols-4">
        <KpiCard label="Módulos" value={String(s.totalModules)} icon="cube" color="var(--color-brand)" sub="analizados" trend={s.trends.modules} trendGood />
        <KpiCard label="Deficiencias" value={String(s.totalDeficiencies)} icon="bug" color="var(--color-risk-high)" sub="detectadas" trend={s.trends.deficiencies} trendGood={false} />
        <KpiCard label="Alto riesgo" value={String(s.highCount)} icon="warn" color="var(--color-risk-med)" sub="requieren revisión" trend={s.trends.high} trendGood={false} />
        <KpiCard label="Bus factor promedio" value={String(s.busFactorAvg)} unit="%" icon="trend" color="var(--color-chart-complexity)" bar={s.busFactorAvg} sub="riesgo por concentración de autores" trend={s.trends.busFactor} trendGood />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.75fr_1fr]">
        <div className="cv-card">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="cv-h2">Componentes de la fórmula ponderada</h2>
              <p className="mt-1 text-[13px] text-muted">{TABS.find((t) => t.key === tab)!.hint}</p>
            </div>
            <div role="tablist" aria-label="Vista de componentes" className="cv-seg">
              {TABS.map((t) => (
                <button key={t.key} role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)} className="cv-seg-btn">{t.label}</button>
              ))}
            </div>
          </div>
          {hasComponents ? (
            <div className="mt-5 flex gap-3">
              <div className="mb-11 flex flex-col justify-between self-end text-xs tabular-nums text-muted" style={{ height: CHART_H }} aria-hidden="true">
                {[1, 0.75, 0.5, 0.25, 0].map((f) => <span key={f} className="leading-none">{Math.round(yMax * f)}</span>)}
              </div>
              <div className="relative flex-1">
              <div aria-hidden="true" className="pointer-events-none absolute inset-x-0" style={{ bottom: 44, height: CHART_H }}>
                {[0, 25, 50, 75, 100].map((p) => <span key={p} className="absolute inset-x-0 border-t border-line" style={{ top: `${p}%` }} />)}
              </div>
              <ul className="relative flex items-end justify-around gap-1">
                {bars.map((b, i) => (
                  <li key={b.key} className="relative flex flex-col items-center">
                    <div className="mb-1.5 text-[13px] font-semibold tabular-nums">{b.value}{suffix}</div>
                    <div className="w-9 rounded-t-md sm:w-12" style={{ height: `${mounted ? (b.value / yMax) * CHART_H : 0}px`, background: FACTOR_COLOR[b.key], transition: `height .8s cubic-bezier(.22,1,.36,1) ${i * 70}ms` }} />
                    <div className="mt-2 h-9 max-w-[5rem] text-center text-xs leading-tight text-soft">{BAR_SHORT[b.key]}</div>
                  </li>
                ))}
              </ul>
              </div>
            </div>
          ) : (
            <p className="cv-empty mt-5">Sin datos todavía: la API no entregó puntajes por componente. Vuelve a analizar el repositorio.</p>
          )}
        </div>

        <div className="cv-card flex flex-col gap-3 border-brand/40 bg-brand-50">
          <h2 className="cv-h2 flex items-center gap-2"><Icon name="info" size={18} className="text-brand" />¿Qué significa este estado?</h2>
          <p className="text-sm leading-relaxed text-soft">El repositorio presenta un <b className="font-semibold text-ink">{levelWord}</b> de mantenibilidad. {advice}</p>
          {hasComponents && (
            <div className="mt-1 flex flex-col gap-3">
              <div className="cv-eyebrow">Lo que más pesa en el puntaje</div>
              {drivers.map((k) => (
                <div key={k}>
                  <div className="flex justify-between text-[13px]"><span className="text-soft">{FACTOR_LABEL[k]}</span><b className="tabular-nums">{Math.round(s.componentAvg[k])}</b></div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface"><div className="h-full rounded-full" style={{ width: `${Math.min(100, s.componentAvg[k])}%`, background: FACTOR_COLOR[k] }} /></div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-auto pt-3">
            <Link to="/modulos" className="cv-btn-primary w-full">
              Ver módulos <Icon name="arrowR" size={14} strokeWidth={2.2} />
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.75fr_1fr]">
        <div className="cv-card flex flex-col">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="cv-h2">Tendencia del riesgo</h2>
              <p className="mt-1 text-[13px] text-muted">
                {!trend ? 'Evolución del riesgo promedio entre análisis guardados.'
                  : trend.direction === 'flat' ? 'El riesgo promedio no cambió desde el análisis anterior.'
                    : `El riesgo promedio ${trend.direction === 'up' ? 'subió' : 'bajó'} ${Math.abs(trend.delta)} puntos (de ${trend.previous} a ${trend.current}).`}
              </p>
            </div>
            <div role="tablist" aria-label="Rango de la tendencia" className="cv-seg">
              {RANGES.map((r, i) => (
                <button key={r.label} role="tab" aria-selected={range === i} onClick={() => setRange(i)} className="cv-seg-btn">{r.label}</button>
              ))}
            </div>
          </div>
          <div className="my-4">
            {series.length >= 2
              ? <TrendChart points={series.map((h) => h.score)} labels={series.map((h) => h.label)} />
              : <p role="status" className="cv-empty">{hist.isPending ? 'Cargando historial…' : 'Sin datos todavía: se necesitan al menos 2 análisis guardados de este repositorio para ver su evolución.'}</p>}
          </div>
          <div className="mt-auto flex items-center justify-end border-t border-line pt-3">
            <Link to="/analisis" className="inline-flex min-h-9 items-center gap-1.5 text-[13px] font-semibold text-brand hover:underline">Ver evolución <Icon name="arrowR" size={13} strokeWidth={2.2} /></Link>
          </div>
        </div>

        <div className="cv-card flex flex-col">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-risk-high-bg text-risk-high-fg"><Icon name="warn" size={18} /></div>
            <div>
              <h2 className="cv-h2">Atención inmediata</h2>
              <div className="text-xs font-semibold text-risk-high">{s.highCount} {s.highCount === 1 ? 'módulo' : 'módulos'} de riesgo alto</div>
            </div>
          </div>
          {top.length === 0
            ? <p className="cv-empty mt-4">Sin datos todavía, ejecuta un análisis.</p>
            : (
              <ol className="mt-4 flex flex-col gap-2">
                {top.map((m, i) => {
                  const f = mainFactor(m.scores)
                  return (
                    <li key={m.path}>
                      <Link to={`/modulos?modulo=${encodeURIComponent(m.path)}`} className="flex items-center gap-3 rounded-lg border border-line px-3 py-2.5 transition-colors hover:border-brand hover:bg-table">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[13px] font-bold tabular-nums" style={{ color: scoreText(m.score), background: `color-mix(in srgb, ${scoreColor(m.score)} 16%, transparent)` }}>{i + 1}</span>
                        <span className="min-w-0 flex-1">
                          <span className="font-code block truncate text-[13px] font-medium">{m.path}</span>
                          <span className="block text-xs text-muted">Puntaje {Math.round(m.score)}{f && ` · pesa más: ${FACTOR_LABEL[f].toLowerCase()}`}</span>
                        </span>
                        <Icon name="chevR" size={15} strokeWidth={2} className="shrink-0 text-muted" />
                      </Link>
                    </li>
                  )
                })}
              </ol>
            )}
          <Link to={s.highCount > 0 ? '/modulos?nivel=HIGH' : '/modulos'} className="cv-btn mt-auto w-full" style={{ marginTop: '1rem' }}>
            {s.highCount > 0 ? 'Revisar módulos de riesgo alto' : 'Ver todos los módulos'} <Icon name="arrowR" size={14} strokeWidth={2.2} />
          </Link>
        </div>
      </section>

      <p className="flex items-center gap-2 text-xs text-muted"><Icon name="info" size={13} />El análisis es de solo lectura: no se modifica el repositorio original.</p>
    </>
  )
}
