import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { apiClient, errorMessage } from '../lib/api'
import { defaultProjectKey, formatDebt, normalizeSonarCompare } from '../lib/sonar'
import { useSonarStatus } from '../lib/useSonar'
import { formatNum, formatP, strengthLabel } from '../lib/validation'

const TH = 'whitespace-nowrap px-3 py-2 text-left text-xs font-semibold text-soft'
const TD = 'px-3 py-2.5 text-sm'

/** Contraste con SonarQube: ¿las métricas propias coinciden con las de una herramienta de referencia? */
export function SonarCard({ repoUrls }: { repoUrls: string[] }) {
  const status = useSonarStatus()
  const httpsUrls = repoUrls.filter((u) => /^https:\/\//.test(u))
  // Campo libre: null = todavía no lo editó (se usa la primera URL de la lista de arriba).
  const [edited, setEdited] = useState<string | null>(null)
  const repoUrl = (edited ?? httpsUrls[0] ?? '').trim()
  const [projectKey, setProjectKey] = useState('')
  // Si pegan una URL en la clave, se usa solo el nombre del repositorio.
  const typed = projectKey.trim()
  const key = typed ? (/[/\s]/.test(typed) ? defaultProjectKey(typed) : typed) : defaultProjectKey(repoUrl)
  const isHttps = /^https:\/\/\S+$/.test(repoUrl)

  const compare = useMutation({
    mutationFn: async () => normalizeSonarCompare(await apiClient.sonarCompare(repoUrl, key)),
  })

  const st = status.data
  const ready = !!st?.configured && !!st?.reachable
  const chip = status.isLoading ? { t: 'Comprobando…', c: 'bg-canvas text-muted' }
    : ready ? { t: `Conectado${st?.version ? ` · v${st.version}` : ''}`, c: 'bg-risk-low-bg text-risk-low-fg' }
    : st?.configured ? { t: 'Sin conexión', c: 'bg-risk-med-bg text-risk-med-fg' }
    : { t: 'No configurado', c: 'bg-canvas text-muted' }

  const r = compare.data

  return (
    <section className="min-w-0 rounded-xl border border-line bg-white p-4" aria-labelledby="sonar-title">
      <div className="flex flex-wrap items-center gap-3">
        <h2 id="sonar-title" className="text-sm font-bold">Contraste con SonarQube <span className="font-normal text-muted">(herramienta de apoyo)</span></h2>
        <span role="status" className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${chip.c}`}>{chip.t}</span>
      </div>
      <p className="mb-3 mt-0.5 text-xs text-muted">
        Compara las métricas de CodeVitals con las de SonarQube sobre los mismos archivos. SonarQube no cambia el puntaje de riesgo.
      </p>

      {!ready && !status.isLoading && (
        <p className="rounded-lg bg-brand-50 p-3 text-xs text-soft">
          {st?.configured
            ? 'SonarQube está configurado pero no responde. Revisa que el contenedor esté en marcha (docker compose --profile sonar up -d).'
            : 'Para activarlo: levanta SonarQube, crea un token y define SONAR_URL y SONAR_TOKEN en backend/.env. Pasos en SONARQUBE.md.'}
        </p>
      )}

      {ready && (
        <form onSubmit={(e) => { e.preventDefault(); if (isHttps && key) compare.mutate() }} className="flex flex-wrap items-end gap-3">
          <div className="min-w-0 flex-1 basis-56">
            <label htmlFor="sonar-repo" className="block text-xs text-soft">Repositorio (URL https://)</label>
            <input
              id="sonar-repo" list="sonar-repos" value={edited ?? httpsUrls[0] ?? ''}
              onChange={(e) => { setEdited(e.target.value); setProjectKey('') }}
              placeholder="https://github.com/pallets/itsdangerous" spellCheck={false}
              className="mt-1 block w-full rounded-lg border border-line bg-white px-3 py-2 font-mono text-xs focus:border-brand"
            />
            <datalist id="sonar-repos">{httpsUrls.map((u) => <option key={u} value={u} />)}</datalist>
          </div>
          <label className="text-xs text-soft">
            Clave del proyecto en SonarQube
            <input
              value={projectKey} onChange={(e) => setProjectKey(e.target.value)} placeholder={defaultProjectKey(repoUrl) || 'loguru'}
              className="mt-1 block w-52 rounded-lg border border-line bg-white px-3 py-2 font-mono text-xs focus:border-brand"
            />
          </label>
          <button type="submit" disabled={!isHttps || !key || compare.isPending} className="rounded-lg bg-brand px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">
            {compare.isPending ? 'Comparando…' : 'Contrastar con SonarQube'}
          </button>
        </form>
      )}
      {ready && key && <p className="mt-2 text-xs text-muted">Se consultará el proyecto «{key}» en SonarQube. Debe coincidir con la clave que usaste al escanear.</p>}
      {ready && repoUrl && !isHttps && <p role="alert" className="mt-2 text-xs text-risk-med-fg">Escribe una URL https:// completa del repositorio.</p>}
      {compare.isPending && <p role="status" className="mt-3 rounded-lg bg-brand-50 p-3 text-xs text-soft">Analizando el repositorio y consultando SonarQube. Puede tardar unos minutos.</p>}
      {compare.isError && <p role="alert" className="mt-3 rounded-lg bg-risk-high-bg p-3 text-xs text-risk-high-fg">{errorMessage(compare.error)}</p>}

      {r && (
        <div className="mt-4">
          <p className="mb-3 text-xs text-soft">
            {r.matched} de {r.ownModules} módulos tienen su archivo en SonarQube ({r.sonarFiles} archivos escaneados).
            {r.matched < r.ownModules && ' Los demás no coincidieron por ruta o no están en el escaneo.'}
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px]">
              <caption className="sr-only">Correlación entre las métricas de CodeVitals y las de SonarQube</caption>
              <thead><tr className="border-b border-line">
                <th scope="col" className={TH}>Métrica</th><th scope="col" className={TH}>Archivos</th><th scope="col" className={TH}>rho</th>
                <th scope="col" className={TH}>Acuerdo</th><th scope="col" className={TH}>Valor p</th>
              </tr></thead>
              <tbody>
                {r.agreement.map((a) => (
                  <tr key={a.metric} className="border-b border-line last:border-0">
                    <th scope="row" className={`${TD} text-left font-semibold`}>{a.metric}</th>
                    <td className={`${TD} tabular-nums`}>{a.n}</td>
                    <td className={`${TD} tabular-nums`}>{formatNum(a.rho)}</td>
                    <td className={`${TD} text-soft`}>{a.note ?? strengthLabel(a.rho)}</td>
                    <td className={`${TD} tabular-nums`}>{formatP(a.pValue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {([['Code smells', r.totals.smells], ['Bugs', r.totals.bugs], ['Vulnerabilidades', r.totals.vulnerabilities]] as [string, number][]).map(([k, v]) => (
              <div key={k} className="rounded-lg border border-line p-3"><dt className="text-[11px] text-soft">{k}</dt><dd className="text-lg font-bold tabular-nums">{v.toLocaleString('es-GT')}</dd></div>
            ))}
            <div className="rounded-lg border border-line p-3"><dt className="text-[11px] text-soft">Deuda técnica</dt><dd className="text-lg font-bold tabular-nums">{formatDebt(r.totals.debtMinutes)}</dd></div>
          </dl>
        </div>
      )}
    </section>
  )
}
