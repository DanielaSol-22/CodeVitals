import { Icon } from './Icon'

export function Pagination({ page, pages, onPage }: { page: number; pages: number; onPage: (p: number) => void }) {
  const btn = 'flex h-8 w-8 items-center justify-center rounded-md border text-xs font-medium transition-colors'
  const nums = Array.from({ length: Math.min(pages, 4) }, (_, i) => i + 1)
  return (
    <nav aria-label="Paginación" className="flex gap-1.5">
      <button aria-label="Página anterior" disabled={page <= 1} onClick={() => onPage(page - 1)} className={`${btn} border-[#e0e4f0] text-soft disabled:opacity-40`}>
        <Icon name="chevL" size={14} />
      </button>
      {nums.map((n) => (
        <button key={n} aria-current={n === page ? 'page' : undefined} onClick={() => onPage(n)} className={`${btn} ${n === page ? 'border-brand bg-brand text-white' : 'border-[#e0e4f0] text-soft hover:bg-brand-50'}`}>
          {n}
        </button>
      ))}
      <button aria-label="Página siguiente" disabled={page >= pages} onClick={() => onPage(page + 1)} className={`${btn} border-[#e0e4f0] text-soft disabled:opacity-40`}>
        <Icon name="chevR" size={14} />
      </button>
    </nav>
  )
}
