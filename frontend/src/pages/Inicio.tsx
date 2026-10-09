import { Link } from 'react-router-dom'
import { useRepo } from '../state/RepoContext'
import { PageHeader } from '../components/PageHeader'
import { DemoBanner } from '../components/DemoBanner'
import { ScoreRing } from '../components/ScoreRing'
import { KpiCard } from '../components/KPICard'
import { Icon } from '../components/Icon'
import { useMounted } from '../lib/useMounted'

const BARS: { key: 'complexity' | 'churn' | 'loc' | 'duplication' | 'busFactor'; label: string; fill: string; line: string }[] = [
  { key: 'complexity', label: 'Complejidad', fill: '#bfe3d0', line: '#4caf7d' },
  { key: 'churn', label: 'Churn', fill: '#fde5a8', line: '#f0b840' },
  { key: 'loc', label: 'Líneas', fill: '#bcd2fb', line: '#4f86e8' },
  { key: 'duplication', label: 'Duplicación', fill: '#d8cffa', line: '#8b6fe8' },
  { key: 'busFactor', label: 'Bus factor', fill: '#f8c6c6', line: '#ee6b6b' },
]

export default function Inicio() {
  const { summary: s } = useRepo()
  const mounted = useMounted()
  const hasComponents = Object.values(s.componentAvg).some((v) => v > 0)
  const meaning =
    s.avgScore >= 70
      ? 'El repositorio presenta un riesgo alto de mantenibilidad. Prioriza de inmediato los módulos con alto riesgo y reduce su deuda técnica.'
      : s.avgScore >= 40
        ? 'El repositorio presenta un riesgo medio de mantenibilidad. Se recomienda revisar los módulos con alto riesgo y priorizar la reducción de deuda técnica.'
        : 'El repositorio presenta un riesgo bajo de mantenibilidad. Mantén las revisiones periódicas para conservar este nivel.'

  return (
    <>
      <PageHeader
        section="panel de diagnóstico"
        title="Estado del repositorio"
        subtitle="Resumen general de la salud del código y métricas de mantenibilidad."
        right={
          <div className="flex items-center gap-2.5 text-[11px] text-muted lg:mt-4">
            <Icon name="calendar" size={18} className="text-soft" />
            <div>Última actualización<br />{s.updatedAt} · {s.totalModules} módulos{s.commits !== null && ` · ${s.commits.toLocaleString('es-GT')} commits`}</div>
          </div>
        }
      />
      <DemoBanner />

      <section className="flex flex-col gap-4 lg:flex-row">
        <div className="flex items-center justify-center rounded-xl border border-line bg-white p-4 sm:p-6 lg:w-[194px] lg:shrink-0">
          <ScoreRing score={s.avgScore} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <KpiCard label="Módulos" value={String(s.totalModules)} icon="cube" tint="#e5f4ec" color="#2f9e63" trend={s.trends.modules} trendGood />
            <KpiCard label="Deficiencias" value={String(s.totalDeficiencies)} icon="bug" tint="#fde8e8" color="#e04d4d" trend={s.trends.deficiencies} trendGood={false} />
            <KpiCard label="Alto riesgo" value={String(s.highCount)} icon="warn" tint="#fff2d8" color="#f0a020" trend={s.trends.high} trendGood />
            <KpiCard label="Bus factor avg" value={`${s.busFactorAvg}%`} icon="trend" tint="#ececfb" color="#5b54e0" trend={s.trends.busFactor} trendGood />
          </div>
          <div className="rounded-xl border border-line bg-white px-4 py-3">
            <h2 className="mb-2.5 text-sm font-bold">Distribución de riesgo</h2>
            <div className="flex h-3.5 overflow-hidden rounded-full" role="img" aria-label={`Bajo ${s.pct.low}%, medio ${s.pct.medium}%, alto ${s.pct.high}%`}>
              <div style={{ flex: s.pct.low, background: '#4caf7d' }} />
              <div style={{ flex: s.pct.medium, background: '#fbc558' }} />
              <div style={{ flex: s.pct.high, background: '#f28c8c' }} />
            </div>
            <div className="mt-2.5 flex text-[11px] text-muted">
              <div style={{ flex: s.pct.low || 1 }}><span className="text-risk-low-bar">●</span> Bajo {s.pct.low}% ({s.counts.low})</div>
              <div style={{ flex: s.pct.medium || 1 }}><span className="text-risk-med">●</span> Medio {s.pct.medium}% ({s.counts.medium})</div>
              <div style={{ flex: s.pct.high || 1 }}><span className="text-risk-high">●</span> Alto {s.pct.high}% ({s.counts.high})</div>
            </div>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-4 lg:flex-row">
        <div className="rounded-xl border border-line bg-white p-4 lg:flex-[1.65] lg:px-5">
          <h2 className="text-sm font-bold">Componentes de la fórmula ponderada</h2>
          <div className="mt-3 flex gap-2">
            <div className="mb-7 flex h-[168px] flex-col justify-between self-end text-[10px] text-muted" aria-hidden="true">
              {[100, 80, 60, 40, 20, 0].map((n) => <span key={n} className="leading-none">{n}</span>)}
            </div>
            {hasComponents ? <ul className="flex flex-1 items-end justify-around border-l border-line">
              {BARS.map((b, i) => {
                const v = Math.round(s.componentAvg[b.key])
                return (
                  <li key={b.key} className="flex flex-col items-center">
                    <div className="mb-1.5 text-xs font-semibold">{v}</div>
                    <div className="w-8 rounded-t-[3px] sm:w-10" style={{ height: `${mounted ? v * 1.68 : 0}px`, background: b.fill, border: `1.5px solid ${b.line}`, transition: `height .8s cubic-bezier(.22,1,.36,1) ${i * 70}ms` }} />
                    <div className="mt-1.5 h-5 text-[11px] text-soft sm:text-xs">{b.label}</div>
                  </li>
                )
              })}
            </ul> : <p className="flex flex-1 items-center justify-center border-l border-line px-4 text-center text-xs text-muted">La API aún no entrega los puntajes por componente de este repositorio.</p>}
          </div>
        </div>
        <div className="flex flex-col gap-2.5 rounded-xl border border-[#d9dcf3] bg-brand-50 p-5 lg:flex-1">
          <h2 className="flex items-center gap-2.5 text-sm font-bold"><Icon name="info" size={20} className="text-brand" />¿Qué significa este estado?</h2>
          <p className="text-[13px] leading-relaxed text-soft">{meaning}</p>
          <div className="mt-1">
            <Link to="/modulos" className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-[#4338ca]">
              Ver módulos <Icon name="arrowR" size={14} strokeWidth={2.2} />
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
