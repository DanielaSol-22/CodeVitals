import { memo } from 'react'
import type { ModuleRow } from '../lib/types'
import { Icon } from './Icon'
import { RiskPill } from './RiskPill'
import { scoreText } from '../lib/risk'

/** Logotipo del lenguaje según la extensión del archivo. */
export function LangIcon({ path, size = 20 }: { path: string; size?: number }) {
  const ext = (path.split('.').pop() ?? '').toLowerCase()
  if (ext === 'py') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label="Python" className="shrink-0">
        <path fill="#3776AB" d="M11.9 2C7.5 2 7.8 3.9 7.8 3.9v2h4.2v.6H6S3 6.2 3 10.9s2.6 4.5 2.6 4.5h1.6v-2.2s-.1-2.6 2.6-2.6h4.4s2.5 0 2.5-2.4V4.5S17.1 2 11.9 2zM9.3 3.5a.8.8 0 110 1.6.8.8 0 010-1.6z" />
        <path fill="#FFD43B" d="M12.1 22c4.4 0 4.1-1.9 4.1-1.9v-2H12v-.6h6s3-.3 3-5-2.6-4.5-2.6-4.5h-1.6v2.2s.1 2.6-2.6 2.6H9.8s-2.5 0-2.5 2.4v3.7S6.9 22 12.1 22zm2.6-1.5a.8.8 0 110-1.6.8.8 0 010 1.6z" />
      </svg>
    )
  }
  const badge: Record<string, [string, string, string]> = {
    js: ['JS', '#F7DF1E', '#111'], jsx: ['JS', '#F7DF1E', '#111'], ts: ['TS', '#3178C6', '#fff'], tsx: ['TS', '#3178C6', '#fff'],
    java: ['Jv', '#E76F00', '#fff'], c: ['C', '#5C6BC0', '#fff'], h: ['H', '#5C6BC0', '#fff'], cpp: ['C+', '#00599C', '#fff'], go: ['Go', '#00ADD8', '#fff'],
  }
  const b = badge[ext]
  if (!b) return <Icon name="file" size={size - 3} className="shrink-0 text-muted" />
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label={ext.toUpperCase()} className="shrink-0">
      <rect x="2" y="2" width="20" height="20" rx="4" fill={b[1]} />
      <text x="12" y="16.2" textAnchor="middle" fontSize="10.5" fontWeight="700" fontFamily="system-ui, sans-serif" fill={b[2]}>{b[0]}</text>
    </svg>
  )
}

/** Barra compacta de calor (verde → ámbar → rojo). El valor exacto va en el tooltip y en texto para lectores de pantalla. */
export function HeatBar({ value, label }: { value: number; label: string }) {
  const pct = Math.min(100, Math.max(4, value))
  return (
    <span className="inline-flex items-center" title={label}>
      <span className="relative block h-1.5 w-16 overflow-hidden rounded-full" style={{ background: 'color-mix(in srgb, var(--color-ink) 12%, transparent)' }} role="img" aria-label={label}>
        <span className="absolute inset-y-0 left-0 block rounded-full" style={{ width: `${pct}%`, backgroundImage: 'linear-gradient(90deg, #2fbf71 0%, #e5b02f 55%, #e5484d 100%)', backgroundSize: `${(100 / pct) * 100}% 100%` }} />
      </span>
    </span>
  )
}

/** Icono minimalista de equipo: menos personas "encendidas" = más riesgo por concentración de autores. */
export function TeamRisk({ risk }: { risk: number }) {
  const filled = risk >= 60 ? 1 : risk >= 30 ? 2 : 3
  const color = risk >= 60 ? 'var(--color-risk-high-bar)' : risk >= 30 ? 'var(--color-risk-med-bar)' : 'var(--color-risk-low-bar)'
  const label = `Bus factor: ${Math.round(risk)} % de riesgo por concentración de autores`
  return (
    <span className="inline-flex items-center gap-0.5" title={label} role="img" aria-label={label}>
      {[0, 1, 2].map((i) => (
        <svg key={i} width="14" height="16" viewBox="0 0 14 16" aria-hidden="true" style={{ color, opacity: i < filled ? 1 : 0.22 }}>
          <circle cx="7" cy="4.5" r="3" fill="currentColor" />
          <path d="M1.5 15c0-3.2 2.4-5 5.500-5s5.500 1.800 5.500 5z" fill="currentColor" />
        </svg>
      ))}
    </span>
  )
}

export const GRID = 'lg:grid-cols-[minmax(0,2.4fr)_96px_72px_92px_84px_72px_84px_20px]'

export const ModuleCard = memo(function ModuleCard({ m, onOpen }: { m: ModuleRow; onOpen: (m: ModuleRow, opener: HTMLElement) => void }) {
  const i = m.path.lastIndexOf('/')
  const dir = i >= 0 ? m.path.slice(0, i + 1) : ''
  const name = i >= 0 ? m.path.slice(i + 1) : m.path
  const heat = m.scores?.complexity > 0 ? m.scores.complexity : Math.min(100, (m.cc / 30) * 100)
  return (
    <div
      role="row"
      onClick={(e) => onOpen(m, e.currentTarget)}
      className={`grid cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-3 rounded-[10px] border border-line bg-surface px-4 py-3 transition-colors hover:border-brand/60 hover:bg-table ${GRID} lg:gap-y-0`}
    >
      <div role="cell" className="min-w-0">
        <button onClick={(e) => { e.stopPropagation(); onOpen(m, e.currentTarget) }} className="flex max-w-full items-center gap-2.5 text-left" aria-label={m.path}>
          <LangIcon path={m.path} />
          <span className="min-w-0">
            <span className="font-code block truncate text-[13px] font-medium text-ink">{name}</span>
            {dir && <span className="block truncate text-xs text-muted">{dir}</span>}
          </span>
        </button>
      </div>
      <div role="cell" className="justify-self-end lg:justify-self-start"><RiskPill level={m.level} /></div>
      <div role="cell" className="font-display text-xl font-bold tabular-nums" style={{ color: scoreText(m.score) }}>
        <span className="mr-1.5 text-xs font-normal text-muted lg:hidden">Puntaje</span>{Math.round(m.score)}
      </div>
      <div role="cell" className="flex items-center gap-2 text-xs text-muted"><span className="lg:hidden">CC</span><HeatBar value={heat} label={`Complejidad ciclomática: ${m.cc}`} /></div>
      <div role="cell" className="flex items-center gap-2 text-xs text-muted"><span className="lg:hidden">Equipo</span><TeamRisk risk={m.busFactor} /></div>
      <div role="cell" className="text-[13px] tabular-nums text-soft"><span className="mr-1.5 text-xs text-muted lg:hidden">Cambios</span>{m.churn}</div>
      <div role="cell" className="text-[13px] tabular-nums text-soft"><span className="mr-1.5 text-xs text-muted lg:hidden">Deficiencias</span>{m.deficiencies}</div>
      <div role="cell" className="hidden text-muted lg:block"><Icon name="chevR" size={16} strokeWidth={2} /></div>
    </div>
  )
})
