import { NavLink } from 'react-router-dom'
import { Icon } from './Icon'
import { NAV } from './nav'
import { useRepo } from '../state/RepoContext'
import { ThemeToggle } from './ThemeToggle'

export function ApiDot({ online }: { online: boolean | null }) {
  const tone = online ? 'bg-risk-low-bar' : online === false ? 'bg-risk-high-bar' : 'bg-muted'
  return <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${tone}`} />
}

export function Brand({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true" className="shrink-0">
        <rect width="32" height="32" rx="8" style={{ fill: 'var(--color-brand)' }} />
        <path d="M5 17h5l3-8 4 15 3-9 1.5 2H27" fill="none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: 'var(--color-on-brand)' }} />
      </svg>
      {!collapsed && <div className="font-display text-[1.2rem] font-extrabold leading-none">CodeVitals</div>}
    </div>
  )
}

/** Formulario del repositorio para móvil (en escritorio se usa la barra de comandos). */
export function RepoField({ compact = false }: { compact?: boolean }) {
  const { repoPath, setRepoPath, analyze, status, recent } = useRepo()
  const fieldId = compact ? 'repo-m' : 'repo'
  const listId = compact ? 'recent-repos-m' : 'recent-repos'
  return (
    <form className="flex flex-col gap-2" onSubmit={(e) => { e.preventDefault(); void analyze() }}>
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
        <Icon name="play" size={14} />{status === 'loading' ? 'Ejecutando…' : 'Ejecutar Diagnóstico'}
      </button>
    </form>
  )
}

/** Dock flotante de navegación (escritorio). En móvil se usa MobileTabBar. */
export function Dock() {
  const { modules, isEmpty } = useRepo()
  return (
    <nav aria-label="Principal" className="fixed bottom-5 left-1/2 z-30 hidden -translate-x-1/2 items-center gap-1 rounded-full border border-line bg-panel p-1.5 shadow-pop lg:flex">
      {NAV.map((n) => (
        <NavLink
          key={n.to}
          to={n.to}
          end={n.to === '/'}
          className={({ isActive }) => `flex min-h-10 items-center gap-2 rounded-full px-4 text-sm transition-colors ${isActive ? 'bg-brand font-semibold text-on-brand' : 'font-medium text-soft hover:bg-table hover:text-ink'}`}
        >
          <Icon name={n.icon} size={17} />
          {n.label}
          {n.to === '/modulos' && !isEmpty && <span className="text-xs tabular-nums opacity-70">{modules.length}</span>}
        </NavLink>
      ))}
    </nav>
  )
}
