export function PageSkeleton() {
  const block = 'animate-pulse rounded-xl bg-[#e6e9f4]'
  return (
    <div role="status" aria-label="Cargando pantalla" className="flex flex-col gap-5">
      <div className="flex flex-col gap-2"><div className={`${block} h-3 w-40`} /><div className={`${block} h-7 w-72`} /><div className={`${block} h-3 w-96 max-w-full`} /></div>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className={`${block} h-24`} />)}</div>
      <div className={`${block} h-64`} />
    </div>
  )
}
