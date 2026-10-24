import type { ReactNode } from 'react'
import { useRepo } from '../state/RepoContext'

export function PageHeader({ section, title, subtitle, right }: { section: string; title: string; subtitle: string; right?: ReactNode }) {
  const { summary, isEmpty } = useRepo()
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div className="min-w-0">
        {!isEmpty && <p className="inline-flex max-w-[60ch] items-center gap-2 truncate rounded-full bg-brand-50 px-3 py-1 font-mono text-xs text-brand" title={`${summary.name} · ${section}`}>{summary.name}</p>}
        <h1 className="font-display mt-3 text-2xl font-bold leading-8">{title}</h1>
        <p className="mt-2 max-w-[62ch] text-sm text-soft">{subtitle}</p>
      </div>
      {right && <div className="w-full min-w-0 sm:w-auto">{right}</div>}
    </header>
  )
}
