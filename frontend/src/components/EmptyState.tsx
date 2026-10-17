import type { ReactNode } from 'react'
import { useRepo } from '../state/RepoContext'
import { StatusBanner } from './StatusBanner'
import { Icon } from './Icon'

/** Pantalla para cuando todavía no hay un repositorio analizado. */
export function RequireRepo({ children }: { children: ReactNode }) {
  const { isEmpty, status, apiOnline } = useRepo()
  if (!isEmpty) return <>{children}</>
  return (
    <>
      <StatusBanner />
      {status !== 'loading' && (
        <section className="cv-card flex flex-col items-center gap-3 px-6 py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand"><Icon name="code" size={24} /></div>
          <h1 className="text-lg font-semibold tracking-tight">Sin datos todavía, ejecuta un análisis</h1>
          <p className="max-w-md text-sm text-soft">
            Escribe la URL de GitHub, GitLab o Bitbucket (o <code className="rounded bg-canvas px-1 font-mono text-xs">local:carpeta</code> para uno clonado) en el campo
            «Repositorio» del menú y pulsa <b>Analizar</b>.
          </p>
          {apiOnline === false && <p className="text-[13px] font-semibold text-risk-high">La API no responde en localhost:8000. Verifica que Docker esté corriendo.</p>}
        </section>
      )}
    </>
  )
}
