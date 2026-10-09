import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Icon } from './Icon'
import { NAV } from './nav'
import { Brand, RepoField } from './Sidebar'

export function MobileTopBar() {
  const [open, setOpen] = useState(false)
  return (
    <div className="lg:hidden">
      <div className="flex items-center gap-2 bg-navy px-4 py-3 text-white">
        <button aria-label={open ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={open} onClick={() => setOpen(!open)} className="-ml-2 flex h-11 w-11 items-center justify-center">
          <Icon name={open ? 'close' : 'menu'} size={22} strokeWidth={2} />
        </button>
        <div className="flex flex-1 justify-center pr-9"><Brand /></div>
      </div>
      {open && (
        <div className="bg-navy px-4 pb-4"><RepoField compact /></div>
      )}
    </div>
  )
}

export function MobileTabBar() {
  return (
    <nav aria-label="Principal" className="fixed inset-x-0 bottom-0 z-20 flex border-t border-line bg-white px-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5 lg:hidden">
      {NAV.map((n) => (
        <NavLink key={n.to} to={n.to} end={n.to === '/'} className={({ isActive }) => `flex min-h-[44px] flex-1 flex-col items-center justify-center gap-1 text-[11px] font-semibold ${isActive ? 'text-brand' : 'text-muted'}`}>
          <Icon name={n.icon} size={22} strokeWidth={1.9} />{n.label}
        </NavLink>
      ))}
    </nav>
  )
}
