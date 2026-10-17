import type { ReactNode } from 'react'
import { useRepo } from '../state/RepoContext'

export function PageHeader({ section, title, subtitle, right }: { section: string; title: string; subtitle: string; right?: ReactNode }) {
  const { summary, isEmpty } = useRepo()
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 border-b border-line pb-5">
      <div className="min-w-0">
        <p className="cv-eyebrow flex items-center gap-2">
          {!isEmpty && <><span className="max-w-[40ch] truncate font-mono normal-case tracking-normal">{summary.name}</span><span aria-hidden="true">/</span></>}
          <span>{section}</span>
        </p>
        <h1 className="mt-2 text-[1.75rem] font-bold leading-tight tracking-tight">{title}</h1>
        <p className="mt-1 max-w-[62ch] text-sm text-soft">{subtitle}</p>
      </div>
      {right && <div className="w-full min-w-0 sm:w-auto">{right}</div>}
    </header>
  )
}
