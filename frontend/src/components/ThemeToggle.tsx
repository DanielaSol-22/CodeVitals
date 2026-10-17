import { useState } from 'react'
import { applyTheme, readTheme, type Theme } from '../lib/theme'

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => (document.documentElement.dataset.theme as Theme) || readTheme())
  const dark = theme === 'dark'
  const toggle = () => {
    const next: Theme = dark ? 'light' : 'dark'
    applyTheme(next)
    setTheme(next)
  }
  return (
    <button type="button" role="switch" aria-checked={dark} onClick={toggle} className="cv-control flex min-h-10 w-full items-center gap-2.5 px-3 py-2 text-[13px] hover:border-brand">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {dark ? <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4M12 8a4 4 0 100 8 4 4 0 000-8z" /> : <path d="M21 13A9 9 0 1111 3a7 7 0 0010 10z" />}
      </svg>
      <span className="flex-1 text-left">Modo oscuro</span>
      <span aria-hidden="true" className={`relative h-5 w-9 rounded-full border border-line transition-colors ${dark ? 'bg-brand' : 'bg-canvas'}`}>
        <span className={`absolute top-0.5 h-3.5 w-3.5 rounded-full transition-all ${dark ? 'left-[18px] bg-on-brand' : 'left-0.5 bg-muted'}`} />
      </span>
    </button>
  )
}
