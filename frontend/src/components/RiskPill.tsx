import type { RiskLevel } from '../lib/types'
import { LEVEL_CLASS, LEVEL_LABEL } from '../lib/risk'

export function RiskPill({ level, size = 'sm' }: { level: RiskLevel; size?: 'sm' | 'md' }) {
  const c = LEVEL_CLASS[level]
  const pad = size === 'md' ? 'px-3 py-1 text-[13px]' : 'px-2.5 py-0.5 text-xs'
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-semibold ${pad} ${c.pill}`}>
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
      {LEVEL_LABEL[level]}
    </span>
  )
}
