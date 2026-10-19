import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Icon } from './Icon'
import { NAV } from './nav'
import { Brand, RepoField } from './Sidebar'
import { ThemeToggle } from './ThemeToggle'

export function MobileTopBar() {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-line bg-canvas lg:hidden">
      <div className="flex items-center gap-2 px-4 py-2.5">
        <Brand />
        <button aria-label={open ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={open} onClick={() => setOpen(!open)} className="-mr-2 ml-auto flex h-11 w-11 items-center justify-center rounded-lg hover:bg-canvas">
          <Icon name={open ? 'close' : 'menu'} size={22} strokeWidth={2} />
        </button>
      </div>
      {open && (
        <div className="flex flex-col gap-3 px-4 pb-4"><RepoField compact /><ThemeToggle /></div>
      )}
    </div>
  )
}

export function MobileTabBar() {
  return (
    <nav aria-label="Principal" className="fixed inset-x-0 bottom-0 z-20 flex border-t border-line bg-canvas px-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5 lg:hidden">
      {NAV.map((n) => (
        <NavLink key={n.to} to={n.to} end={n.to === '/'} className={({ isActive }) => `flex min-h-[48px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg text-[11px] font-semibold ${isActive ? 'bg-nav-active text-brand' : 'text-muted'}`}>
          <Icon name={n.icon} size={21} strokeWidth={1.9} /><span className="max-w-full truncate px-0.5">{n.short}</span>
        </NavLink>
      ))}
    </nav>
  )
}
