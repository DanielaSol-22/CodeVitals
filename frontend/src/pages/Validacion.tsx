import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { PageHeader } from '../components/PageHeader'
import { KpiCard } from '../components/KPICard'
import { Icon } from '../components/Icon'
import { ToolComparison } from '../components/ToolComparison'
import { useToast } from '../components/Toast'
import { useRepo } from '../state/RepoContext'
import { apiClient, errorMessage } from '../lib/api'
import { fileStamp } from '../lib/export'
import {
  MAX_REPOS, formatNum, formatP, isRepoRef, normalizeValidation, parseRepoUrls, strengthLabel, validationCsv,
  type ValidationResult,
} from '../lib/validation'

const STORE_KEY = 'codevitals.validation'
const ALPHAS = [0.01, 0.05, 0.1]

function loadSaved(): ValidationResult | null {
  try {
    const raw = sessionStorage.getItem(STORE_KEY)
    return raw ? (JSON.parse(raw) as ValidationResult) : null
  } catch {
    return null
  }
}
function save(v: ValidationResult) {
  try { sessionStorage.setItem(STORE_KEY, JSON.stringify(v)) } catch { /* sin almacenamiento */ }
}

function Badge({ ok, yes = 'Significativo', no = 'No significativo' }: { ok: boolean; yes?: string; no?: string }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${ok ? 'bg-risk-low-bg text-risk-low-fg' : 'bg-canvas text-soft'}`}>
      {ok ? yes : no}
    </span>
  )
}

/** Barra divergente: el centro es rho = 0, a la derecha positivo, a la izquierda negativo. */
function RhoBar({ rho }: { rho: number | null }) {
  const w = rho === null ? 0 : Math.min(1, Math.abs(rho)) * 50
  return (
    <div className="relative h-2 w-28 rounded-full bg-canvas" role="img" aria-label={`rho ${formatNum(rho)}`}>
      <span className="absolute inset-y-0 left-1/2 w-px bg-line" />
      <span
        className={`absolute inset-y-0 rounded-full ${rho !== null && rho < 0 ? 'bg-risk-high-bar' : 'bg-brand'}`}
        style={rho !== null && rho < 0 ? { right: '50%', width: `${w}%` } : { left: '50%', width: `${w}%` }}
      />
    </div>
  )
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="cv-card">
      <h2 className="cv-h2">{title}</h2>
      {subtitle && <p className="mb-3 mt-0.5 text-xs text-muted">{subtitle}</p>}
      <div className={subtitle ? '' : 'mt-3'}>{children}</div>
    </section>
  )
}

const TH = 'cv-th'
const TD = 'cv-td'
const STICKY_TH = 'cv-th cv-sticky-head'
const STICKY_TD = 'cv-td cv-sticky text-left font-semibold'

export default function Validacion() {
  const { repoPath, recent } = useRepo()
  const toast = useToast()
  const [text, setText] = useState(() => (isRepoRef(repoPath) ? repoPath : recent.find(isRepoRef) ?? ''))
  const [alpha, setAlpha] = useState(0.05)
  const [result, setResult] = useState<ValidationResult | null>(loadSaved)

  const urls = parseRepoUrls(text)
  const tooMany = urls.length > MAX_REPOS

  const run = useMutation({
    mutationFn: async () => normalizeValidation(await apiClient.validateRepos(urls, alpha)),
    onSuccess: (v) => {
      setResult(v)
      save(v)
      toast.push('success', `Validación lista: ${v.nModules} módulos de ${v.repositories.length} repositorio(s).`)
    },
  })

  const exportCsv = () => {
    if (!result) return
    const blob = new Blob(['﻿' + validationCsv(result)], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = fileStamp('validacion', 'csv')
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const sigSp = result?.spearman.filter((s) => s.significant).length ?? 0
  const sigChi = result?.chiSquare.filter((s) => s.significant).length ?? 0

  return (
    <>
      <PageHeader
        section="validación"
        title="Validación estadística"
        subtitle="Comprueba si cada métrica se relaciona con el puntaje de riesgo (Spearman y chi-cuadrado)."
        right={
          result && (
            <button type="button" onClick={exportCsv} className="cv-btn">
              <Icon name="download" size={14} /> Exportar CSV
            </button>
          )
        }
      />

      <form
        onSubmit={(e) => { e.preventDefault(); if (urls.length && !tooMany) run.mutate() }}
        className="cv-card"
      >
        <label htmlFor="repos" className="cv-h2">Repositorios a analizar</label>
        <p id="repos-help" className="mb-2 mt-0.5 text-xs text-muted">Una URL por línea (máximo {MAX_REPOS}). Más repositorios dan resultados más confiables.</p>
        <textarea
          id="repos" aria-describedby="repos-help" rows={3} value={text} onChange={(e) => setText(e.target.value)}
          placeholder="https://github.com/usuario/repositorio"
          className="cv-control w-full p-3 font-mono text-xs focus:border-brand"
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-soft">
            Nivel de significancia (α)
            <select value={alpha} onChange={(e) => setAlpha(Number(e.target.value))} className="cv-control px-2 py-1.5">
              {ALPHAS.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </label>
          <span className="text-xs text-muted">{urls.length} repositorio(s)</span>
          <button
            type="submit" disabled={!urls.length || tooMany || run.isPending}
            className="cv-btn-primary ml-auto"
          >
            {run.isPending ? 'Ejecutando…' : 'Ejecutar validación'}
          </button>
        </div>
        {tooMany && <p role="alert" className="mt-2 text-xs text-risk-high-fg">Máximo {MAX_REPOS} repositorios por validación.</p>}
        {run.isPending && (
          <p role="status" className="mt-3 rounded-lg bg-brand-50 p-3 text-xs text-soft">
            Analizando los repositorios. La primera vez puede tardar varios minutos.
          </p>
        )}
        {run.isError && <p role="alert" className="mt-3 rounded-lg bg-risk-high-bg p-3 text-xs text-risk-high-fg">{errorMessage(run.error)}</p>}
      </form>

      {!result && !run.isPending && (
        <div className="cv-empty">
          Sin datos todavía: pega las URLs y ejecuta la validación para ver las correlaciones.
        </div>
      )}

      {result && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KpiCard label="Módulos analizados" value={String(result.nModules)} icon="modules" color="var(--color-brand)" />
            <KpiCard label="Spearman significativos" value={`${sigSp} de ${result.spearman.length}`} icon="trend" color="var(--color-risk-med)" />
            <KpiCard label="Chi-cuadrado significativos" value={`${sigChi} de ${result.chiSquare.length}`} icon="stats" color="var(--color-risk-high)" />
            {result.external?.sufficient && result.external.score
              ? <KpiCard label="rho vs. correcciones de errores" value={formatNum(result.external.score.rho)} icon="code" color="var(--color-risk-low)" />
              : <KpiCard label="Repositorios" value={String(result.repositories.length)} icon="code" color="var(--color-risk-low)" />}
          </div>

          {result.failed.length > 0 && (
            <div role="alert" className="rounded-xl border border-risk-med-bar bg-risk-med-bg p-3 text-xs text-risk-med-fg">
              <strong>No se pudieron analizar {result.failed.length} repositorio(s):</strong>
              <ul className="mt-1 list-disc pl-5">
                {result.failed.map((f) => <li key={f.repoUrl}>{f.repoUrl}: {f.error}</li>)}
              </ul>
            </div>
          )}
          {!result.sufficient && (
            <div role="alert" className="rounded-xl border border-risk-med-bar bg-risk-med-bg p-3 text-xs text-risk-med-fg">
              La muestra es muy pequeña para pruebas confiables. Agrega más repositorios.
            </div>
          )}


          <Card title="Cada métrica contra el riesgo" subtitle={`Spearman mide la dirección y fuerza; chi-cuadrado, si hay asociación con el nivel de riesgo. α = ${result.alpha}.`}>
            <div className="cv-table-wrap">
              <table className="cv-table min-w-[560px]">
                <caption className="sr-only">Resultados de Spearman y chi-cuadrado por métrica</caption>
                <thead className="bg-table"><tr>
                  <th scope="col" className={STICKY_TH}>Métrica</th><th scope="col" className={TH}>rho</th>
                  <th scope="col" className={TH}>Fuerza</th><th scope="col" className={TH}>Spearman</th><th scope="col" className={TH}>Chi-cuadrado</th>
                </tr></thead>
                <tbody>
                  {result.spearman.map((s) => {
                    const chi = result.chiSquare.find((c) => c.variable === s.variable)
                    return (
                      <tr key={s.variable} className="cv-tr" title={s.interpretation}>
                        <th scope="row" className={STICKY_TD}>{s.label}</th>
                        <td className={TD}><div className="flex items-center gap-3"><span className="w-14 tabular-nums">{formatNum(s.rho)}</span><RhoBar rho={s.rho} /></div></td>
                        <td className={`${TD} text-soft`}>{strengthLabel(s.rho)}</td>
                        <td className={TD}><Badge ok={s.significant} /></td>
                        <td className={TD}>
                          {chi ? <Badge ok={chi.significant} /> : '—'}
                          {chi?.lowExpected && <span className="ml-2 text-xs text-risk-med-fg" title="Hay frecuencias esperadas menores a 5">⚠ frecuencias bajas</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          <details className="group cv-card">
            <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold">
              Ver detalle completo
              <span className="text-xs font-normal text-muted">chi-cuadrado, validez externa, sensibilidad y muestra</span>
            </summary>
            <div className="mt-4 space-y-5">
          <Card title="Chi-cuadrado de independencia" subtitle="Nivel de riesgo (bajo, medio, alto) contra terciles de cada métrica. V de Cramér mide el tamaño del efecto.">
            <div className="cv-table-wrap">
              <table className="cv-table min-w-[640px]">
                <caption className="sr-only">Resultados de la prueba chi-cuadrado</caption>
                <thead className="bg-table"><tr>
                  <th scope="col" className={STICKY_TH}>Métrica</th><th scope="col" className={TH}>χ²</th><th scope="col" className={TH}>gl</th>
                  <th scope="col" className={TH}>V de Cramér</th><th scope="col" className={TH}>Valor p</th><th scope="col" className={TH}>Resultado</th>
                </tr></thead>
                <tbody>
                  {result.chiSquare.map((c) => (
                    <tr key={c.variable} className="cv-tr" title={c.interpretation}>
                      <th scope="row" className={STICKY_TD}>{c.label}{!c.inFormula && <span className="ml-2 rounded-full bg-risk-low-bg px-2 py-0.5 align-middle text-xs font-semibold text-risk-low-fg" title="Esta métrica no forma parte de la fórmula del puntaje: su relación con él no es circular.">fuera de la fórmula</span>}</th>
                      <td className={`${TD} tabular-nums`}>{formatNum(c.chi2, 2)}</td>
                      <td className={`${TD} tabular-nums`}>{c.dof ?? '—'}</td>
                      <td className={`${TD} tabular-nums`}>{formatNum(c.cramersV)}</td>
                      <td className={`${TD} tabular-nums`}>{formatP(c.pValue)}</td>
                      <td className={TD}>
                        <Badge ok={c.significant} />
                        {c.lowExpected && <span className="ml-2 text-xs text-risk-med-fg" title="Hay frecuencias esperadas menores a 5">⚠ frecuencias bajas</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {result.external && (
            <Card
              title="Validez externa: correcciones de errores"
              subtitle={`Criterio independiente del puntaje: proporción de commits de corrección por archivo (módulos con ${result.external.minCommits}+ commits).`}
            >
              {!result.external.sufficient ? (
                <p role="status" className="rounded-lg bg-brand-50 p-3 text-xs text-soft">{result.external.note}</p>
              ) : (
                <>
                  <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <KpiCard label="Módulos evaluados" value={`${result.external.nEligible} de ${result.external.nTotal}`} icon="modules" color="var(--color-brand)" />
                    <KpiCard label="Con alguna corrección" value={String(result.external.nWithFixes)} icon="code" color="var(--color-risk-low)" />
                    <KpiCard label="rho puntaje vs. correcciones" value={formatNum(result.external.score?.rho ?? null)} icon="trend" color="var(--color-risk-med)" />
                    <KpiCard label="Kruskal-Wallis (p)" value={result.external.kruskal ? formatP(result.external.kruskal.pValue) : '—'} icon="stats" color="var(--color-risk-high)" />
                  </div>
                  <p className="mb-3 text-xs text-soft">
                    {result.external.score?.interpretation}{' '}
                    {result.external.kruskal && (result.external.kruskal.significant
                      ? 'La proporción de correcciones difiere entre los niveles de riesgo.'
                      : 'No se encontraron diferencias significativas entre niveles de riesgo.')}
                  </p>
                  <div className="grid gap-5 lg:grid-cols-2">
                    <div className="cv-table-wrap">
                      <table className="cv-table min-w-[300px]">
                        <caption className="sr-only">Proporción de correcciones por nivel de riesgo</caption>
                        <thead className="bg-table"><tr>
                          <th scope="col" className={TH}>Nivel</th><th scope="col" className={TH}>Módulos</th><th scope="col" className={TH}>Media</th><th scope="col" className={TH}>Mediana</th>
                        </tr></thead>
                        <tbody>
                          {result.external.byClass.map((c) => (
                            <tr key={c.classification} className="cv-tr">
                              <th scope="row" className={`${TD} text-left font-semibold`}>{{ LOW: 'Bajo', MEDIUM: 'Medio', HIGH: 'Alto' }[c.classification]}</th>
                              <td className={`${TD} tabular-nums`}>{c.n}</td>
                              <td className={`${TD} tabular-nums`}>{(c.meanRatio * 100).toFixed(1)}%</td>
                              <td className={`${TD} tabular-nums`}>{(c.medianRatio * 100).toFixed(1)}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="cv-table-wrap">
                      <table className="cv-table min-w-[300px]">
                        <caption className="sr-only">Correlación de cada métrica con la proporción de correcciones</caption>
                        <thead className="bg-table"><tr>
                          <th scope="col" className={TH}>Métrica</th><th scope="col" className={TH}>rho</th><th scope="col" className={TH}>Resultado</th>
                        </tr></thead>
                        <tbody>
                          {result.external.byMetric.map((s) => (
                            <tr key={s.variable} className="cv-tr" title={s.interpretation}>
                              <th scope="row" className={`${TD} text-left font-semibold`}>{s.label}</th>
                              <td className={`${TD} tabular-nums`}>{formatNum(s.rho)}</td>
                              <td className={TD}><Badge ok={s.significant} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
              <p className="mt-3 text-xs text-muted">{result.external.note}</p>
            </Card>
          )}

          {result.sensitivity?.sufficient && result.sensitivity.monteCarlo && (
            <Card
              title="Sensibilidad de los pesos"
              subtitle={`¿Cambian los resultados si los pesos de la fórmula varían ±${Math.round(result.sensitivity.delta * 100)} %? Se mide qué porcentaje de módulos cambia de nivel de riesgo.`}
            >
              <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
                <KpiCard label="Cambio de nivel (mediana)" value={`${result.sensitivity.monteCarlo.medianPctChanged.toFixed(1)}%`} icon="modules" color="var(--color-brand)" />
                <KpiCard label="Cambio de nivel (p95)" value={`${result.sensitivity.monteCarlo.p95PctChanged.toFixed(1)}%`} icon="trend" color="var(--color-risk-med)" />
                <KpiCard label="Peor caso" value={`${result.sensitivity.monteCarlo.worstPctChanged.toFixed(1)}%`} icon="stats" color="var(--color-risk-high)" />
                <KpiCard label="Orden conservado (rho mín.)" value={result.sensitivity.monteCarlo.minRho.toFixed(3)} icon="code" color="var(--color-risk-low)" />
              </div>
              <p className="mb-3 text-xs text-soft">
                En {result.sensitivity.monteCarlo.runs.toLocaleString('es-GT')} simulaciones con todos los pesos variando a la vez, la mitad de las veces cambia de nivel el {result.sensitivity.monteCarlo.medianPctChanged.toFixed(1)}% de los módulos o menos,
                y el orden de prioridad se conserva (rho ≥ {result.sensitivity.monteCarlo.minRho.toFixed(3)}).
                {result.sensitivity.mostSensitive && result.sensitivity.mostSensitive.pctChanged > 0 && ` El peso más influyente es «${result.sensitivity.mostSensitive.label}» (${result.sensitivity.mostSensitive.pctChanged.toFixed(1)}% de módulos cambian al ${result.sensitivity.mostSensitive.direction === 'sube' ? 'subirlo' : 'bajarlo'}).`}
              </p>
              <div className="cv-table-wrap">
                <table className="cv-table">
                  <caption className="sr-only">Cambio de nivel de riesgo al variar cada peso por separado</caption>
                  <thead className="bg-table"><tr>
                    <th scope="col" className={STICKY_TH}>Peso</th><th scope="col" className={TH}>Valor actual</th><th scope="col" className={TH}>Si</th>
                    <th scope="col" className={TH}>Módulos que cambian de nivel</th><th scope="col" className={TH}>rho del orden</th>
                  </tr></thead>
                  <tbody>
                    {result.sensitivity.scenarios.map((x) => (
                      <tr key={x.weight + x.direction} className="cv-tr">
                        <th scope="row" className={STICKY_TD}>{x.label}</th>
                        <td className={`${TD} tabular-nums`}>{x.baseWeight.toFixed(3)}</td>
                        <td className={`${TD} text-soft`}>{x.direction === 'sube' ? `+${Math.round(result.sensitivity!.delta * 100)}%` : `−${Math.round(result.sensitivity!.delta * 100)}%`}</td>
                        <td className={`${TD} tabular-nums`}>{x.pctChanged.toFixed(1)}%</td>
                        <td className={`${TD} tabular-nums`}>{x.rho.toFixed(3)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          <div className="grid gap-5 lg:grid-cols-2">
            <Card title="Estadística descriptiva">
              <div className="cv-table-wrap">
                <table className="cv-table min-w-[420px]">
                  <thead className="bg-table"><tr>
                    {['Variable', 'Media', 'Mediana', 'Desv.', 'Mín', 'Máx'].map((h, i) => <th key={h} scope="col" className={i === 0 ? STICKY_TH : TH}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {result.descriptives.map((d) => (
                      <tr key={d.label} className="cv-tr">
                        <th scope="row" className={STICKY_TD}>{d.label}</th>
                        {[d.mean, d.median, d.std, d.min, d.max].map((v, i) => <td key={i} className={`${TD} tabular-nums`}>{formatNum(v, 1)}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
            <Card title="Muestra por repositorio">
              <div className="cv-table-wrap">
                <table className="cv-table min-w-[360px]">
                  <thead className="bg-table"><tr>
                    <th scope="col" className={STICKY_TH}>Repositorio</th><th scope="col" className={TH}>Módulos</th><th scope="col" className={TH}>Commits</th>
                  </tr></thead>
                  <tbody>
                    {result.repositories.map((r) => (
                      <tr key={r.repoUrl} className="cv-tr">
                        <th scope="row" className={`${STICKY_TD} max-w-[260px] truncate font-medium`} title={r.repoUrl}>{r.repoUrl.replace(/^https?:\/\/(www\.)?github\.com\//, '')}</th>
                        <td className={`${TD} tabular-nums`}>{r.modules}</td>
                        <td className={`${TD} tabular-nums`}>{r.totalCommits}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
            </div>
          </details>

          {result.note && (
            <aside className="flex gap-3 rounded-xl border border-line bg-brand-50 p-4 text-xs text-soft">
              <Icon name="info" size={18} className="mt-0.5 shrink-0 text-brand" />
              <p>{result.note}</p>
            </aside>
          )}
          <p className="text-xs text-muted">{result.saved ? 'Resultados guardados en la base de datos.' : 'Los resultados no se pudieron guardar en la base de datos.'}</p>
        </>
      )}

      <ToolComparison repoUrls={urls} />
    </>
  )
}
