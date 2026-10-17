import { NavLink } from 'react-router-dom'
import { Icon } from './Icon'
import { NAV } from './nav'
import { useRepo } from '../state/RepoContext'
import { ThemeToggle } from './ThemeToggle'

function ApiDot({ online }: { online: boolean | null }) {
  const tone = online ? 'bg-risk-low-bar' : online === false ? 'bg-risk-high-bar' : 'bg-muted'
  return <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${tone}`} />
}

export function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-on-brand">
        <Icon name="code" size={19} strokeWidth={2.1} />
      </div>
      <div>
        <div className="text-[15px] font-bold leading-tight tracking-tight">CodeVitals</div>
        <div className="text-xs leading-tight text-muted">Mantenibilidad del código</div>
      </div>
    </div>
  )
}

export function RepoField({ compact = false }: { compact?: boolean }) {
  const { repoPath, setRepoPath, analyze, status, recent } = useRepo()
  const fieldId = compact ? 'repo-m' : 'repo'
  const listId = compact ? 'recent-repos-m' : 'recent-repos'
  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        void analyze()
      }}
    >
      <label htmlFor={fieldId} className="cv-label">Repositorio</label>
      <input
        id={fieldId}
        list={listId}
        value={repoPath}
        onChange={(e) => setRepoPath(e.target.value)}
        placeholder="https://github.com/usuario/repo o local:carpeta"
        className="cv-control w-full px-3 py-2.5 font-mono text-xs placeholder:text-muted focus:border-brand"
      />
      <datalist id={listId}>{recent.map((r) => <option key={r} value={r} />)}</datalist>
      <button disabled={status === 'loading'} className="cv-btn-primary w-full">
        <Icon name="search" size={15} strokeWidth={2.2} />{status === 'loading' ? 'Analizando…' : 'Analizar'}
      </button>
    </form>
  )
}

export function Sidebar() {
  const { apiOnline, modules, isEmpty } = useRepo()
  return (
    <aside className="sticky top-0 hidden h-screen w-[256px] shrink-0 flex-col border-r border-line bg-surface p-4 lg:flex">
      <div className="px-1 pb-6 pt-1"><Brand /></div>
      <nav aria-label="Principal" className="flex flex-col gap-0.5">
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.to === '/'}
            className={({ isActive }) => `flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isActive ? 'bg-nav-active font-semibold text-brand' : 'text-soft hover:bg-canvas hover:text-ink'}`}
          >
            <Icon name={n.icon} size={18} />
            <span className="flex-1">{n.label}</span>
            {n.to === '/modulos' && !isEmpty && <span className="text-xs tabular-nums text-muted">{modules.length}</span>}
          </NavLink>
        ))}
      </nav>
      <div className="flex-1" />
      <div className="border-t border-line pt-4"><RepoField /></div>
      <div className="mt-3"><ThemeToggle /></div>
      <div role="status" className="mt-3 flex items-center gap-2 px-1 text-xs text-muted">
        <ApiDot online={apiOnline} />
        {apiOnline ? 'API conectada' : apiOnline === false ? 'API sin conexión' : 'Comprobando API…'}
      </div>
    </aside>
  )
}
