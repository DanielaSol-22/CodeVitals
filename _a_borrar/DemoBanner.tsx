import { useRepo } from '../state/RepoContext'

export function DemoBanner() {
  const { isDemo, status, error, apiOnline } = useRepo()
  if (status === 'loading') return <div role="status" className="rounded-lg border border-line bg-white px-4 py-2.5 text-xs text-soft">Analizando repositorio… puede tardar según el número de commits.</div>
  if (status === 'error' && error) return <div role="alert" className="rounded-lg border border-risk-high/30 bg-risk-high-bg px-4 py-2.5 text-xs text-risk-high-fg">{error}</div>
  if (isDemo)
    return (
      <div role="status" className="rounded-lg border border-line bg-brand-50 px-4 py-2.5 text-xs text-soft">
        Estás viendo datos de ejemplo. Escribe la URL de un repositorio Git en el menú y pulsa Analizar.
        {apiOnline === false && <span className="ml-1 font-semibold text-risk-high-fg">La API no responde en localhost:8000.</span>}
      </div>
    )
  return null
}
