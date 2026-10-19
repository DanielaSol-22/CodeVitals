import { useLocation, useSearchParams } from 'react-router-dom'
import { Icon } from './Icon'
import { useRepo } from '../state/RepoContext'
import { levelFromScore } from '../lib/risk'
import { ApiDot, Brand } from './Sidebar'
import { ThemeToggle } from './ThemeToggle'

const shortRepo = (s: string) => s.replace(/^https?:\/\/(www\.)?github\.com\//i, '').replace(/\.git$/, '').replace(/^local:/, '')

/**
 * Barra de comandos unificada: repositorio + búsqueda de módulos + ejecución, en una sola estructura
 * que se parece a la línea de comandos de un IDE.
 */
export function CommandBar() {
  const { repoPath, setRepoPath, analyze, status, recent, summary, isEmpty, apiOnline } = useRepo()
  const { pathname } = useLocation()
  const [params, setParams] = useSearchParams()
  const onModules = pathname.startsWith('/modulos')
  const q = params.get('q') ?? ''
  const loading = status === 'loading'
  const setQ = (v: string) => setParams((prev) => {
    const next = new URLSearchParams(prev)
    if (v) next.set('q', v); else next.delete('q')
    next.delete('pagina')
    return next
  }, { replace: true })
  const dot = loading ? 'bg-risk-med-bar' : isEmpty ? 'bg-muted' : levelFromScore(summary.avgScore) === 'HIGH' ? 'bg-risk-high-bar' : levelFromScore(summary.avgScore) === 'MEDIUM' ? 'bg-risk-med-bar' : 'bg-risk-low-bar'

  return (
    <div className="sticky top-0 z-30 hidden border-b border-line bg-canvas/85 backdrop-blur lg:block">
      <form className="mx-auto flex max-w-[1320px] items-center gap-4 px-10 py-3" onSubmit={(e) => { e.preventDefault(); void analyze() }}>
        <Brand />
        <div className="flex min-w-0 flex-1 items-center rounded-lg border border-line bg-surface font-mono text-[13px] transition-colors focus-within:border-brand">
          <span className="flex items-center gap-2 pl-3 pr-2 text-brand" aria-hidden="true"><Icon name="terminal" size={16} /></span>
          {!isEmpty && (
            <span className="mr-2 inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line bg-table px-2.5 py-0.5 text-xs text-soft" title={summary.name}>
              <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${dot}`} />
              <Icon name="branch" size={12} />
              <span className="max-w-[22ch] truncate">{shortRepo(summary.name)}</span>
            </span>
          )}
          <label htmlFor="cmd-repo" className="sr-only">Repositorio</label>
          <input
            id="cmd-repo"
            list="cmd-recent"
            value={repoPath}
            onChange={(e) => setRepoPath(e.target.value)}
            placeholder="https://github.com/usuario/repo o local:carpeta"
            spellCheck={false}
            className="min-w-0 flex-1 bg-transparent py-2.5 pr-3 text-ink outline-none placeholder:text-muted"
          />
          <datalist id="cmd-recent">{recent.map((r) => <option key={r} value={r} />)}</datalist>
          {onModules && (
            <>
              <span aria-hidden="true" className="h-5 w-px bg-line" />
              <span className="flex items-center gap-2 pl-3 text-muted" aria-hidden="true"><Icon name="search" size={14} /></span>
              <label htmlFor="cmd-search" className="sr-only">Buscar módulo</label>
              <input
                id="cmd-search"
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="buscar módulo…"
                spellCheck={false}
                className="w-48 bg-transparent px-3 py-2.5 text-ink outline-none placeholder:text-muted"
              />
            </>
          )}
        </div>
        <button disabled={loading} className="cv-btn-primary shrink-0">
          <Icon name="play" size={13} />{loading ? 'Ejecutando…' : 'Ejecutar Diagnóstico'}
        </button>
        <div role="status" className="flex shrink-0 items-center gap-2 whitespace-nowrap text-xs text-muted">
          <ApiDot online={apiOnline} />
          {apiOnline ? 'API conectada' : apiOnline === false ? 'API sin conexión' : 'Comprobando API…'}
        </div>
        <div className="w-11 shrink-0"><ThemeToggle compact /></div>
      </form>
    </div>
  )
}
