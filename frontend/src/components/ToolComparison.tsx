import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { apiClient, errorMessage } from '../lib/api'
import { defaultProjectKey, normalizeToolsCompare, normalizeSonarCompare, type ToolAgreement } from '../lib/sonar'
import { useSonarStatus } from '../lib/useSonar'
import { formatNum, formatP, strengthLabel } from '../lib/validation'

const TH = 'cv-th'
const TD = 'cv-td'

/** ¿Las métricas de CodeVitals coinciden con las de herramientas de referencia? Radon siempre; SonarQube si está conectado. */
export function ToolComparison({ repoUrls }: { repoUrls: string[] }) {
  const status = useSonarStatus()
  const repoUrl = (repoUrls[0] ?? '').trim()
  const key = defaultProjectKey(repoUrl)
  const sonarReady = !!status.data?.configured && !!status.data?.reachable && /^https:\/\//.test(repoUrl)

  const [rows, setRows] = useState<ToolAgreement[] | null>(null)
  const [info, setInfo] = useState('')

  const compare = useMutation({
    mutationFn: async () => {
      const t = normalizeToolsCompare(await apiClient.toolsCompare(repoUrl))
      let out = t.rows
      let text = t.errors.map((e) => `${e.tool}: ${e.error}`).join(' ')
      if (sonarReady) {
        try {
          const s = normalizeSonarCompare(await apiClient.sonarCompare(repoUrl, key))
          out = [...out, ...s.agreement.map((a) => ({ ...a, tool: 'SonarQube', scope: 'según su configuración', files: a.n }))]
          text += ` SonarQube: ${s.matched} de ${s.ownModules} módulos.`.trimStart()
        } catch (e) {
          text += ` SonarQube no respondió (${errorMessage(e)}).`
        }
      }
      return { out, text }
    },
    onSuccess: ({ out, text }) => { setRows(out); setInfo(text) },
  })

  return (
    <section className="cv-card" aria-labelledby="tools-title">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <h2 id="tools-title" className="cv-h2">Contraste con otras herramientas</h2>
          <p className="mt-0.5 text-xs text-muted">
            scc (todos los lenguajes) y Radon (solo Python){sonarReady ? ', más SonarQube,' : ''} sobre el primer repositorio de la lista. Se compara el orden de los módulos, no el valor exacto. No cambian el puntaje.
          </p>
        </div>
        <button type="button" className="cv-btn-primary" disabled={!repoUrl || compare.isPending} onClick={() => compare.mutate()}>
          {compare.isPending ? 'Comparando…' : 'Comparar'}
        </button>
      </div>
      {compare.isError && <p role="alert" className="mt-3 rounded-lg bg-risk-high-bg p-3 text-xs text-risk-high-fg">{errorMessage(compare.error)}</p>}
      {rows && (
        <div className="mt-4">
          <p className="mb-3 text-xs text-soft">{info}</p>
          <div className="cv-table-wrap">
            <table className="cv-table min-w-[640px]">
              <caption className="sr-only">Correlación entre CodeVitals y otras herramientas</caption>
              <thead className="bg-table"><tr>
                <th scope="col" className={`${TH} cv-sticky-head`}>Herramienta</th><th scope="col" className={TH}>Métrica</th>
                <th scope="col" className={TH}>Archivos</th><th scope="col" className={TH}>rho</th><th scope="col" className={TH}>Acuerdo</th><th scope="col" className={TH}>Valor p</th>
              </tr></thead>
              <tbody>
                {rows.map((a) => (
                  <tr key={a.tool + a.metric} className="cv-tr">
                    <th scope="row" className={`${TD} cv-sticky text-left font-semibold`}>{a.tool} <span className="font-normal text-muted">({a.scope})</span></th>
                    <td className={TD}>{a.metric}</td>
                    <td className={`${TD} tabular-nums`}>{a.files}</td>
                    <td className={`${TD} tabular-nums`}>{formatNum(a.rho)}</td>
                    <td className={`${TD} text-soft`}>{a.note ?? strengthLabel(a.rho)}</td>
                    <td className={`${TD} tabular-nums`}>{formatP(a.pValue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  )
}
