import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Icon } from './Icon'

type Kind = 'success' | 'error'
interface ToastItem { id: number; kind: Kind; text: string }
interface ToastApi { push: (kind: Kind, text: string) => void }

const Ctx = createContext<ToastApi | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const nextId = useRef(1)
  const timers = useRef(new Map<number, number>())

  const dismiss = useCallback((id: number) => {
    window.clearTimeout(timers.current.get(id))
    timers.current.delete(id)
    setItems((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const push = useCallback((kind: Kind, text: string) => {
    const id = nextId.current++
    setItems((prev) => [...prev.slice(-2), { id, kind, text }])
    timers.current.set(id, window.setTimeout(() => dismiss(id), kind === 'error' ? 7000 : 4000))
  }, [dismiss])

  useEffect(() => {
    const t = timers.current
    return () => t.forEach((h) => window.clearTimeout(h))
  }, [])

  const api = useMemo(() => ({ push }), [push])

  return (
    <Ctx.Provider value={api}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed bottom-20 right-4 z-40 flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2 lg:bottom-6">
        {items.map((t) => (
          <div key={t.id} role={t.kind === 'error' ? 'alert' : 'status'} className={`pointer-events-auto flex items-start gap-3 rounded-lg border px-4 py-3 text-[13px] shadow-pop animate-[toast-in_.25s_ease-out] ${t.kind === 'error' ? 'border-risk-high-bar bg-risk-high-bg text-risk-high-fg' : 'border-risk-low-bar bg-risk-low-bg text-risk-low-fg'}`}>
            <Icon name={t.kind === 'error' ? 'warn' : 'check'} size={16} strokeWidth={2.2} className="mt-px shrink-0" />
            <span className="min-w-0 flex-1 break-words">{t.text}</span>
            <button aria-label="Cerrar aviso" onClick={() => dismiss(t.id)} className="-m-2 flex h-9 w-9 shrink-0 items-center justify-center"><Icon name="close" size={13} strokeWidth={2.2} /></button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}

export function useToast(): ToastApi {
  const v = useContext(Ctx)
  if (!v) throw new Error('useToast debe usarse dentro de ToastProvider')
  return v
}
