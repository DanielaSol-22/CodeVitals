/** Esqueleto mostrado mientras se descarga una pantalla. */
export default function PageSkeleton() {
  return (
    <div className="p-7 md:p-9 animate-pulse" role="status" aria-label="Cargando pantalla">
      <div className="h-7 w-64 rounded bg-[#E3D9C5]" />
      <div className="mt-3 h-4 w-96 max-w-full rounded bg-[#E3D9C5]" />
      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded bg-[#E3D9C5]" />
        ))}
      </div>
      <div className="mt-6 h-64 rounded bg-[#E3D9C5]" />
    </div>
  );
}
