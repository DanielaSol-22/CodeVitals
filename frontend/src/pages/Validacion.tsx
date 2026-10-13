import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { PageHeader } from '../components/PageHeader'
import { KpiCard } from '../components/KPICard'
import { Icon } from '../components/Icon'
import { SonarCard } from '../components/SonarCard'
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
    <span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ${ok ? 'bg-risk-low-bg text-risk-low-fg' : 'bg-canvas text-muted'}`}>
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
    <section className="min-w-0 rounded-xl border border-line bg-white p-4">
      <h2 className="text-sm font-bold">{title}</h2>
      {subtitle && <p className="mb-3 mt-0.5 text-xs text-muted">{subtitle}</p>}
      <div className={subtitle ? '' : 'mt-3'}>{children}</div>
    </section>
  )
}

const TH = 'whitespace-nowrap px-3 py-2 text-left text-xs font-semibold text-soft'
const TD = 'px-3 py-2.5 text-sm'

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
            <button type="button" onClick={exportCsv} className="flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-xs font-semibold hover:bg-canvas">
              <Icon name="download" size={14} /> Exportar CSV
            </button>
          )
        }
      />

      <form
        onSubmit={(e) => { e.preventDefault(); if (urls.length && !tooMany) run.mutate() }}
        className="rounded-xl border border-line bg-white p-4"
      >
        <label htmlFor="repos" className="text-sm font-bold">Repositorios a analizar</label>
        <p id="repos-help" className="mb-2 mt-0.5 text-xs text-muted">Una URL de Git por línea. Mientras más repositorios, más confiable la muestra (máximo {MAX_REPOS}).</p>
        <textarea
          id="repos" aria-describedby="repos-help" rows={5} value={text} onChange={(e) => setText(e.target.value)}
          placeholder="https://github.com/usuario/repositorio"
          className="w-full rounded-lg border border-line bg-white p-3 font-mono text-xs focus:border-brand"
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-soft">
            Nivel de significancia (α)
            <select value={alpha} onChange={(e) => setAlpha(Number(e.target.value))} className="rounded-lg border border-line bg-white px-2 py-1.5">
              {ALPHAS.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </label>
          <span className="text-xs text-muted">{urls.length} repositorio(s)</span>
          <button
            type="submit" disabled={!urls.length || tooMany || run.isPending}
            className="ml-auto rounded-lg bg-brand px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
          >
            {run.isPending ? 'Ejecutando…' : 'Ejecutar validación'}
          </button>
        </div>
        {tooMany && <p role="alert" className="mt-2 text-xs text-risk-high-fg">Máximo {MAX_REPOS} repositorios por validación.</p>}
        {run.isPending && (
          <p role="status" className="mt-3 rounded-lg bg-brand-50 p-3 text-xs text-soft">
            Clonando y analizando el historial de cada repositorio. La primera vez puede tardar varios minutos; después queda en caché y es rápido. No cierres esta página.
          </p>
        )}
        {run.isError && <p role="alert" className="mt-3 rounded-lg bg-risk-high-bg p-3 text-xs text-risk-high-fg">{errorMessage(run.error)}</p>}
      </form>

      {!result && !run.isPending && (
        <div className="rounded-xl border border-dashed border-line bg-white p-8 text-center text-sm text-muted">
          Pega las URLs y ejecuta la validación para ver las correlaciones.
        </div>
      )}

      {result && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KpiCard label="Módulos analizados" value={String(result.nModules)} icon="modules" tint="#f0f1fb" color="#4f46e5" />
            <KpiCard label="Repositorios" value={String(result.repositories.length)} icon="code" tint="#e3f5ec" color="#237a4d" />
            <KpiCard label="Spearman significativos" value={`${sigSp} de ${result.spearman.length}`} icon="trend" tint="#fff0d0" color="#8f5a05" />
            <KpiCard label="Chi-cuadrado significativos" value={`${sigChi} de ${result.chiSquare.length}`} icon="stats" tint="#fde8e8" color="#b42e2e" />
          </div>

          {result.failed.length > 0 && (
            <div role="alert" className="rounded-xl border border-risk-med bg-risk-med-bg p-3 text-xs text-risk-med-fg">
              <strong>No se pudieron analizar {result.failed.length} repositorio(s):</strong>
              <ul className="mt-1 list-disc pl-5">
                {result.failed.map((f) => <li key={f.repoUrl}>{f.repoUrl}: {f.error}</li>)}
              </ul>
            </div>
          )}
          {!result.sufficient && (
            <div role="alert" className="rounded-xl border border-risk-med bg-risk-med-bg p-3 text-xs text-risk-med-fg">
              La muestra es muy pequeña para pruebas confiables. Agrega más repositorios.
            </div>
          )}

          <Card title="Correlación de Spearman" subtitle={`Métrica contra puntaje de riesgo. α = ${result.alpha}. El signo indica la dirección; |rho| la fuerza.`}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <caption className="sr-only">Resultados de la correlación de Spearman</caption>
                <thead><tr className="border-b border-line">
                  <th scope="col" className={TH}>Métrica</th><th scope="col" className={TH}>rho</th><th scope="col" className={TH}>Fuerza</th>
                  <th scope="col" className={TH}>Valor p</th><th scope="col" className={TH}>Resultado</th>
                </tr></thead>
                <tbody>
                  {result.spearman.map((s) => (
                    <tr key={s.variable} className="border-b border-line last:border-0" title={s.interpretation}>
                      <th scope="row" className={`${TD} text-left font-semibold`}>{s.label}{!s.inFormula && <span className="ml-2 rounded-full bg-[#e3f4ea] px-2 py-0.5 align-middle text-[10px] font-semibold text-[#17703f]" title="Esta métrica no forma parte de la fórmula del puntaje: su relación con él no es circular.">fuera de la fórmula</span>}</th>
                      <td className={TD}><div className="flex items-center gap-3"><span className="w-14 tabular-nums">{formatNum(s.rho)}</span><RhoBar rho={s.rho} /></div></td>
                      <td className={`${TD} text-soft`}>{strengthLabel(s.rho)}</td>
                      <td className={`${TD} tabular-nums`}>{formatP(s.pValue)}</td>
                      <td className={TD}><Badge ok={s.significant} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card title="Chi-cuadrado de independencia" subtitle="Nivel de riesgo (bajo, medio, alto) contra terciles de cada métrica. V de Cramér mide el tamaño del efecto.">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <caption className="sr-only">Resultados de la prueba chi-cuadrado</caption>
                <thead><tr className="border-b border-line">
                  <th scope="col" className={TH}>Métrica</th><th scope="col" className={TH}>χ²</th><th scope="col" className={TH}>gl</th>
                  <th scope="col" className={TH}>V de Cramér</th><th scope="col" className={TH}>Valor p</th><th scope="col" className={TH}>Resultado</th>
                </tr></thead>
                <tbody>
                  {result.chiSquare.map((c) => (
                    <tr key={c.variable} className="border-b border-line last:border-0" title={c.interpretation}>
                      <th scope="row" className={`${TD} text-left font-semibold`}>{c.label}{!c.inFormula && <span className="ml-2 rounded-full bg-[#e3f4ea] px-2 py-0.5 align-middle text-[10px] font-semibold text-[#17703f]" title="Esta métrica no forma parte de la fórmula del puntaje: su relación con él no es circular.">fuera de la fórmula</span>}</th>
                      <td className={`${TD} tabular-nums`}>{formatNum(c.chi2, 2)}</td>
                      <td className={`${TD} tabular-nums`}>{c.dof ?? '—'}</td>
                      <td className={`${TD} tabular-nums`}>{formatNum(c.cramersV)}</td>
                      <td className={`${TD} tabular-nums`}>{formatP(c.pValue)}</td>
                      <td className={TD}>
                        <Badge ok={c.significant} />
                        {c.lowExpected && <span className="ml-2 text-[11px] text-risk-med-fg" title="Hay frecuencias esperadas menores a 5">⚠ frecuencias bajas</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card title="Estadística descriptiva">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[420px]">
                  <thead><tr className="border-b border-line">
                    {['Variable', 'Media', 'Mediana', 'Desv.', 'Mín', 'Máx'].map((h) => <th key={h} scope="col" className={TH}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {result.descriptives.map((d) => (
                      <tr key={d.label} className="border-b border-line last:border-0">
                        <th scope="row" className={`${TD} text-left font-semibold`}>{d.label}</th>
                        {[d.mean, d.median, d.std, d.min, d.max].map((v, i) => <td key={i} className={`${TD} tabular-nums`}>{formatNum(v, 1)}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
            <Card title="Muestra por repositorio">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[360px]">
                  <thead><tr className="border-b border-line">
                    <th scope="col" className={TH}>Repositorio</th><th scope="col" className={TH}>Módulos</th><th scope="col" className={TH}>Commits</th>
                  </tr></thead>
                  <tbody>
                    {result.repositories.map((r) => (
                      <tr key={r.repoUrl} className="border-b border-line last:border-0">
                        <th scope="row" className={`${TD} max-w-[260px] truncate text-left font-medium`} title={r.repoUrl}>{r.repoUrl.replace(/^https?:\/\/(www\.)?github\.com\//, '')}</th>
                        <td className={`${TD} tabular-nums`}>{r.modules}</td>
                        <td className={`${TD} tabular-nums`}>{r.totalCommits}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {result.note && (
            <aside className="flex gap-3 rounded-xl border border-line bg-brand-50 p-4 text-xs text-soft">
              <Icon name="info" size={18} className="mt-0.5 shrink-0 text-brand" />
              <p>{result.note}</p>
            </aside>
          )}
          <p className="text-[11px] text-muted">{result.saved ? 'Resultados guardados en la base de datos.' : 'Los resultados no se pudieron guardar en la base de datos.'}</p>
        </>
      )}

      <SonarCard repoUrls={urls} />
    </>
  )
}
