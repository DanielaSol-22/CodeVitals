import { Link } from 'react-router-dom'
import type { ModuleRow } from '../lib/types'
import { levelFromScore } from '../lib/risk'

const BAR = { LOW: 'var(--color-risk-low-bar)', MEDIUM: 'var(--color-risk-med-bar)', HIGH: 'var(--color-risk-high-bar)' }

/**
 * Mapa de riesgo en cuadrícula regular (como las contribuciones de GitHub):
 * una celda por módulo, ordenadas de mayor a menor puntaje. Color = nivel de riesgo, intensidad = puntaje.
 */
export function RiskMap({ modules }: { modules: ModuleRow[] }) {
  const cells = [...modules].sort((a, b) => b.score - a.score)
  return (
    <div
      className="grid grid-cols-[repeat(auto-fill,minmax(124px,1fr))] gap-1.5"
      role="group"
      aria-label={`Mapa de riesgo de ${modules.length} módulos, ordenados de mayor a menor puntaje; el color es el nivel de riesgo`}
    >
      {cells.map((m) => {
        const bar = BAR[levelFromScore(m.score)]
        return (
          <Link
            key={m.path}
            to={`/modulos?modulo=${encodeURIComponent(m.path)}`}
            title={`${m.path} · puntaje ${Math.round(m.score)}${m.loc > 0 ? ` · ${m.loc} líneas` : ''}`}
            className="flex h-[72px] min-w-0 flex-col justify-end rounded-md border p-2 transition-colors hover:border-ink focus-visible:z-10"
            style={{
              background: `color-mix(in srgb, ${bar} ${18 + Math.round(m.score * 0.42)}%, var(--color-surface))`,
              borderColor: `color-mix(in srgb, ${bar} 45%, transparent)`,
            }}
          >
            <span className="font-code block truncate text-xs leading-tight text-ink">{m.path.split('/').pop()}</span>
            <span className="text-sm font-bold leading-tight tabular-nums text-ink">{Math.round(m.score)}</span>
          </Link>
        )
      })}
    </div>
  )
}
