import { useRepo } from '../state/RepoContext'
import { useSonarFiles, useSonarStatus } from '../lib/useSonar'
import { defaultProjectKey, findSonarFile, formatDebt } from '../lib/sonar'
import type { ModuleRow } from '../lib/types'

const cell = (v: number | null) => (v == null ? '—' : v.toLocaleString('es-GT'))

/** Indicadores de SonarQube para un archivo. No se muestra nada si SonarQube no está disponible. */
export function SonarSection({ module: m }: { module: ModuleRow }) {
  const { repoPath, isEmpty } = useRepo()
  const status = useSonarStatus()
  const online = !isEmpty && !!status.data?.configured && !!status.data?.reachable
  const files = useSonarFiles(repoPath, online)

  if (!online || files.isLoading) return null
  const key = defaultProjectKey(repoPath)
  const file = files.data ? findSonarFile(files.data, m.path) : undefined

  if (!file) {
    return (
      <section className="mt-4 rounded-xl border border-line p-4">
        <h3 className="mb-1 text-sm font-semibold">SonarQube</h3>
        <p className="text-xs text-muted">
          Sin datos de SonarQube para este archivo. Escanea el proyecto «{key}» (ver SONARQUBE.md) y vuelve a abrir el detalle.
        </p>
      </section>
    )
  }

  const rows: [string, string, string?][] = [
    ['Code smells', cell(file.smells)],
    ['Bugs', cell(file.bugs)],
    ['Vulnerabilidades', cell(file.vulnerabilities)],
    ['Deuda técnica', formatDebt(file.debtMinutes)],
    ['Complejidad ciclomática', `${cell(file.complexity)} (Sonar) · ${m.cc} (CodeVitals)`],
    ...(file.cognitive != null || m.cognitive != null
      ? [['Complejidad cognitiva', `${cell(file.cognitive)} (Sonar) · ${m.cognitive ?? '—'} (CodeVitals)`] as [string, string]]
      : []),
  ]

  return (
    <section className="mt-4 rounded-xl border border-line p-4">
      <h3 className="mb-1 text-sm font-semibold">SonarQube <span className="font-normal text-muted">(contraste, no afecta el puntaje)</span></h3>
      <dl>
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 border-t border-line py-2 text-xs"><dt className="text-soft">{k}</dt><dd className="text-right font-semibold tabular-nums">{v}</dd></div>
        ))}
      </dl>
    </section>
  )
}
