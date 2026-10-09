import type { ReactNode } from 'react'
import { useRepo } from '../state/RepoContext'

export function PageHeader({ section, title, subtitle, right }: { section: string; title: string; subtitle: string; right?: ReactNode }) {
  const { summary } = useRepo()
  return (
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="text-xs text-muted">{summary.name} &nbsp;/&nbsp; {section}</div>
        <h1 className="mb-1 mt-1 text-2xl font-bold">{title}</h1>
        <p className="text-sm text-muted">{subtitle}</p>
      </div>
      {right}
    </header>
  )
}
