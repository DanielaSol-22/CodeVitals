export type Theme = 'light' | 'dark'
const KEY = 'codevitals.theme'

export function readTheme(): Theme {
  try {
    const v = localStorage.getItem(KEY)
    if (v === 'light' || v === 'dark') return v
  } catch { /* almacenamiento no disponible */ }
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function applyTheme(t: Theme): void {
  document.documentElement.dataset.theme = t
  try { localStorage.setItem(KEY, t) } catch { /* ignorar */ }
}
