export function PageSkeleton() {
  const block = 'animate-pulse rounded-lg bg-line'
  return (
    <div role="status" aria-label="Cargando pantalla" className="flex flex-col gap-5">
      <div className="flex flex-col gap-2 border-b border-line pb-5"><div className={`${block} h-3 w-40`} /><div className={`${block} h-8 w-72`} /><div className={`${block} h-3 w-96 max-w-full`} /></div>
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className={`${block} h-28`} />)}</div>
      <div className={`${block} h-64`} />
    </div>
  )
}
