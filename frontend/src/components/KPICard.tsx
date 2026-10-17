import type { ReactNode } from 'react'
import { Icon, type IconName } from './Icon'

/**
 * Tarjeta de indicador. `color` acepta cualquier valor CSS (hex o var(--token)).
 * `tint` se conserva por compatibilidad: el fondo del ícono se deriva de `color`.
 */
export function KpiCard({ label, value, icon, tint, color, trend, trendGood, sub, bar, badge, unit }: {
  label: string; value: string; icon: IconName; tint?: string; color: string; trend?: number; trendGood?: boolean
  sub?: string; bar?: number; badge?: ReactNode; unit?: string
}) {
  const increaseIsGood = trendGood ?? true
  const favorable = trend === undefined || trend === 0 ? null : increaseIsGood ? trend > 0 : trend < 0
  const trendClass = favorable === null ? 'text-muted' : favorable ? 'text-risk-low' : 'text-risk-high'
  void tint
  return (
    <div className="cv-card flex min-w-0 flex-col gap-3">
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ background: `color-mix(in srgb, ${color} 14%, transparent)`, color }}>
          <Icon name={icon} size={17} />
        </div>
        <div className="cv-label min-w-0 flex-1">{label}</div>
        {badge}
      </div>
      <div className="min-w-0">
        <div className="flex items-baseline gap-1">
          <span className="truncate text-[2rem] font-bold leading-none tracking-tight tabular-nums">{value}</span>
          {unit && <span className="text-lg font-semibold text-muted">{unit}</span>}
        </div>
        {bar !== undefined && (
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-canvas" role="presentation">
            <div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.max(0, bar))}%`, background: color }} />
          </div>
        )}
        {sub && <div className="mt-2 text-xs text-soft">{sub}</div>}
        {trend !== undefined && (
          <div className="mt-1 text-xs text-muted">
            <span className={`font-semibold ${trendClass}`}>{trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%</span> vs. anterior
          </div>
        )}
      </div>
    </div>
  )
}
