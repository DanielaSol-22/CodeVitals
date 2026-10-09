import { Icon, type IconName } from './Icon'

export function KpiCard({ label, value, icon, tint, color, trend, trendGood }: {
  label: string; value: string; icon: IconName; tint: string; color: string; trend?: number; trendGood?: boolean
}) {
  return (
    <div className="flex min-w-0 gap-3 rounded-xl border border-line bg-white p-3.5 transition-shadow hover:shadow-md">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ background: tint, color }}>
        <Icon name={icon} size={22} />
      </div>
      <div className="min-w-0">
        <div className="text-xs text-soft">{label}</div>
        <div className="my-0.5 text-2xl font-bold">{value}</div>
        {trend !== undefined && (
          <div className="text-[11px] text-muted">
            <span className={`font-bold ${trendGood ? 'text-risk-low' : 'text-risk-high'}`}>{trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%</span> vs. anterior
          </div>
        )}
      </div>
    </div>
  )
}
