import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from './Icon'
import { RiskPill } from './RiskPill'
import type { ModuleRow } from '../lib/types'

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

export function ModuleDetail({ module: m, onClose }: { module: ModuleRow; onClose: () => void }) {
  const titleId = useId()
  const dialog = useRef<HTMLDivElement>(null)
  const closeBtn = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    closeBtn.current?.focus()
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') return onClose()
      if (e.key !== 'Tab' || !dialog.current) return
      // Mantiene el foco dentro del diálogo mientras está abierto.
      const items = Array.from(dialog.current.querySelectorAll<HTMLElement>(FOCUSABLE))
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [onClose])

  const summary: [string, string][] = [
    ['Complejidad (CC)', String(m.cc)],
    ['Churn', String(m.churn)],
    ['Líneas de código', m.loc.toLocaleString('es-GT')],
    ['Bus factor', `${m.busFactor}%`],
    ['Deficiencias', String(m.deficiencies)],
  ]

  return createPortal(
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-ink/40 p-0 sm:items-center sm:p-6" onClick={onClose}>
      <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby={titleId} onClick={(e) => e.stopPropagation()} className="max-h-full w-full max-w-[760px] animate-[sheet-in_.22s_ease-out] overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-xl">
        <div className="flex items-center gap-3">
          <button aria-label="Volver" onClick={onClose} className="-ml-2 flex h-11 w-11 items-center justify-center text-brand"><Icon name="arrowL" size={18} strokeWidth={2.2} /></button>
          <Icon name="file" size={16} className="shrink-0 text-muted" />
          <h2 id={titleId} className="min-w-0 flex-1 truncate text-sm font-bold">{m.path}</h2>
          <RiskPill level={m.level} size="md" />
          <button ref={closeBtn} aria-label="Cerrar" onClick={onClose} className="-mr-2 flex h-11 w-11 items-center justify-center text-soft"><Icon name="close" size={16} strokeWidth={2.2} /></button>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_1.2fr]">
          <section className="rounded-lg border border-line p-4">
            <h3 className="mb-2 text-[13px] font-bold">Resumen</h3>
            <dl>
              {summary.map(([k, v]) => (
                <div key={k} className="flex justify-between border-t border-[#f0f2f8] py-2 text-xs"><dt className="text-soft">{k}</dt><dd className="font-semibold tabular-nums">{v}</dd></div>
              ))}
            </dl>
          </section>
          <section className="rounded-lg border border-line p-4">
            <h3 className="mb-2 text-[13px] font-bold">Recomendaciones</h3>
            {m.actions.length === 0 ? <p className="text-xs text-muted">Sin recomendaciones para este módulo.</p> : (
              <ul className="flex flex-col gap-2">
                {m.actions.map((a) => <li key={a} className="flex gap-2.5 text-xs leading-relaxed text-soft"><span className="text-brand" aria-hidden="true">•</span>{a}</li>)}
              </ul>
            )}
          </section>
        </div>

        {m.commits.length > 0 && (
          <section className="mt-4 rounded-lg border border-line p-4">
            <h3 className="mb-1 text-[13px] font-bold">Historial de cambios</h3>
            <ul>
              {m.commits.map((c) => (
                <li key={c.hash + c.message} className="flex items-center gap-3 border-t border-[#f0f2f8] py-2.5 text-xs">
                  <code className="rounded bg-[#f0f2f8] px-1.5 py-0.5 text-[11px]">{c.hash}</code>
                  <span className="min-w-0 flex-1 truncate">{c.message}</span>
                  <span className="text-[11px] text-muted">{c.when}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>,
    document.body,
  )
}
