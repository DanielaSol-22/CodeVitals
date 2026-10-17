import { Icon } from './Icon'

/** Ventana de números alrededor de la página actual (nunca se queda anclada en 1–4). */
export function pageWindow(page: number, pages: number, size = 4): number[] {
  if (pages <= 0) return []
  if (pages <= size) return Array.from({ length: pages }, (_, i) => i + 1)
  const half = Math.floor((size - 1) / 2)
  let start = Math.max(1, page - half)
  let end = start + size - 1
  if (end > pages) {
    end = pages
    start = Math.max(1, end - size + 1)
  }
  return Array.from({ length: end - start + 1 }, (_, i) => start + i)
}

export function Pagination({ page, pages, onPage }: { page: number; pages: number; onPage: (p: number) => void }) {
  const btn = 'flex h-9 w-9 items-center justify-center rounded-lg border text-[13px] font-medium tabular-nums transition-colors'
  const nums = pageWindow(page, pages)
  return (
    <nav aria-label="Paginación" className="flex gap-1.5">
      <button aria-label="Página anterior" disabled={page <= 1} onClick={() => onPage(page - 1)} className={`${btn} border-line text-soft hover:border-brand hover:text-brand disabled:opacity-40 disabled:hover:border-line disabled:hover:text-soft`}>
        <Icon name="chevL" size={14} />
      </button>
      {nums.map((n) => (
        <button key={n} aria-current={n === page ? 'page' : undefined} onClick={() => onPage(n)} className={`${btn} ${n === page ? 'border-brand bg-brand text-on-brand' : 'border-line text-soft hover:border-brand hover:text-brand'}`}>
          {n}
        </button>
      ))}
      <button aria-label="Página siguiente" disabled={page >= pages} onClick={() => onPage(page + 1)} className={`${btn} border-line text-soft hover:border-brand hover:text-brand disabled:opacity-40 disabled:hover:border-line disabled:hover:text-soft`}>
        <Icon name="chevR" size={14} />
      </button>
    </nav>
  )
}
