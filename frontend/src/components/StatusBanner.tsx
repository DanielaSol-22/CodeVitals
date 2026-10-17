import { useRepo } from '../state/RepoContext'
import { Icon } from './Icon'

/** Aviso de estado: analizando o error. Sin repositorio no muestra nada (lo cubre EmptyState). */
export function StatusBanner() {
  const { status, error, apiOnline } = useRepo()
  if (status === 'loading') {
    return (
      <div role="status" className="flex items-center gap-3 rounded-lg border border-line bg-surface px-4 py-3 text-[13px] text-soft">
        <span aria-hidden="true" className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-line border-t-brand" />
        Analizando repositorio… puede tardar según el número de commits.
      </div>
    )
  }
  if (status === 'error' && error) {
    return (
      <div role="alert" className="flex items-start gap-3 rounded-lg border border-risk-high-bar bg-risk-high-bg px-4 py-3 text-[13px] text-risk-high-fg">
        <Icon name="warn" size={16} className="mt-0.5 shrink-0" />
        <span>{error}{apiOnline === false && <b className="ml-1 font-semibold">La API no responde en localhost:8000.</b>}</span>
      </div>
    )
  }
  return null
}
