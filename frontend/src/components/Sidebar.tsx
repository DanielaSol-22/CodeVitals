import { NavLink } from 'react-router-dom'
import { Icon } from './Icon'
import { NAV } from './nav'
import { useRepo } from '../state/RepoContext'

export function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg border-[1.5px] border-[#dfe5ff] text-[#dfe5ff]">
        <Icon name="code" size={20} strokeWidth={2} />
      </div>
      <div>
        <div className="text-sm font-bold text-white">CodeVitals</div>
        <div className="text-[10px] text-navy-mute">Análisis de mantenibilidad</div>
      </div>
    </div>
  )
}

export function RepoField({ compact = false }: { compact?: boolean }) {
  const { repoPath, setRepoPath, analyze, status, recent } = useRepo()
  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        void analyze()
      }}
    >
      <label htmlFor={compact ? 'repo-m' : 'repo'} className="px-1 text-[11px] text-navy-mute">Repositorio</label>
      <input
        id={compact ? 'repo-m' : 'repo'}
        list="recent-repos"
        value={repoPath}
        onChange={(e) => setRepoPath(e.target.value)}
        placeholder="https://github.com/usuario/repo"
        className="w-full rounded-lg border border-navy-line bg-navy-2 px-3 py-2.5 text-xs text-white placeholder:text-navy-mute"
      />
      <datalist id="recent-repos">{recent.map((r) => <option key={r} value={r} />)}</datalist>
      <button disabled={status === 'loading'} className="rounded-lg bg-brand px-3 py-2 text-xs font-semibold text-white disabled:opacity-60">
        {status === 'loading' ? 'Analizando…' : 'Analizar'}
      </button>
    </form>
  )
}

export function Sidebar() {
  const { apiOnline } = useRepo()
  return (
    <aside className="sticky top-2 hidden h-[calc(100vh-1rem)] w-[200px] shrink-0 flex-col rounded-xl bg-navy p-4 text-navy-text lg:flex">
      <div className="pb-6"><Brand /></div>
      <nav aria-label="Principal" className="flex flex-col gap-1.5">
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.to === '/'} className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors ${isActive ? 'bg-brand text-white' : 'hover:bg-navy-2'}`}>
            <Icon name={n.icon} size={20} />{n.label}
          </NavLink>
        ))}
        <span className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium opacity-50" aria-disabled="true">
          <Icon name="settings" size={20} />Configuración
        </span>
      </nav>
      <div className="flex-1" />
      <RepoField />
      <div className="mt-3 flex items-center gap-2 px-1 text-[11px] text-navy-mute">
        <span aria-hidden="true" className={`h-2 w-2 rounded-full ${apiOnline ? 'bg-risk-low-bar' : apiOnline === false ? 'bg-risk-high' : 'bg-navy-line'}`} />
        {apiOnline ? 'API conectada' : apiOnline === false ? 'API sin conexión' : 'Comprobando API…'}
      </div>
    </aside>
  )
}
