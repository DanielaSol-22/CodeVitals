export type Theme = 'light' | 'dark'
const KEY = 'codevitals.theme'

export function readTheme(): Theme {
  try {
    const v = localStorage.getItem(KEY)
    if (v === 'light' || v === 'dark') return v
  } catch { /* almacenamiento no disponible */ }
  return 'dark' // el tema oscuro es el predeterminado
}

export function applyTheme(t: Theme): void {
  document.documentElement.dataset.theme = t
  try { localStorage.setItem(KEY, t) } catch { /* ignorar */ }
}
