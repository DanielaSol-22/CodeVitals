import type { ReactNode } from 'react'
import { Icon, type IconName } from './Icon'

/** Indicador. `color` acepta cualquier valor CSS (hex o var(--token)). `tint` se conserva por compatibilidad. */
export function KpiCard({ label, value, icon, tint, color, trend, trendGood, sub, bar, badge, unit }: {
  label: string; value: string; icon: IconName; tint?: string; color: string; trend?: number; trendGood?: boolean
  sub?: string; bar?: number; badge?: ReactNode; unit?: string
}) {
  const increaseIsGood = trendGood ?? true
  const favorable = trend === undefined || trend === 0 ? null : increaseIsGood ? trend > 0 : trend < 0
  const trendClass = favorable === null ? 'text-muted' : favorable ? 'text-risk-low' : 'text-risk-high'
  void tint
  return (
    <div className="cv-card relative flex min-w-0 flex-col gap-2">
      <div className="relative flex items-center gap-2" style={{ color }}>
        <Icon name={icon} size={17} />
        <div className="cv-label min-w-0 flex-1 !text-muted">{label}</div>
        {badge}
      </div>
      <div className="relative flex items-baseline gap-1">
        <span className="font-display truncate text-[2.6rem] font-bold leading-none tabular-nums">{value}</span>
        {unit && <span className="text-lg font-medium text-muted">{unit}</span>}
      </div>
      {bar !== undefined && (
        <div className="relative h-1.5 overflow-hidden rounded-full bg-canvas" role="presentation">
          <div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.max(0, bar))}%`, background: color }} />
        </div>
      )}
      {sub && <div className="relative text-xs text-soft">{sub}</div>}
      {trend !== undefined && (
        <div className="relative text-xs text-muted">
          <span className={`font-semibold ${trendClass}`}>{trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%</span> vs. anterior
        </div>
      )}
    </div>
  )
}
