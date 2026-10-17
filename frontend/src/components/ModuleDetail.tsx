import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from './Icon'
import { RiskPill } from './RiskPill'
import { SonarSection } from './SonarSection'
import type { ModuleRow, RecPriority } from '../lib/types'

const PRIORITY_STYLE: Record<RecPriority, string> = {
  ALTA: 'bg-risk-high-bg text-risk-high-fg',
  MEDIA: 'bg-risk-med-bg text-risk-med-fg',
  BAJA: 'bg-risk-low-bg text-risk-low-fg',
}

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
    ['Frecuencia de cambios (commits)', String(m.churn)],
    ...(m.churnLines ? [['Code churn (líneas)', m.churnLines.toLocaleString('es-GT')] as [string, string]] : []),
    ...(m.cognitive != null ? [['Complejidad cognitiva', String(m.cognitive)] as [string, string]] : []),
    ['Líneas de código', m.loc.toLocaleString('es-GT')],
    ['Bus factor', `${m.busFactor}%`],
    ['Deficiencias', String(m.deficiencies)],
  ]

  return createPortal(
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/55 p-0 sm:items-center sm:p-6" onClick={onClose}>
      <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby={titleId} onClick={(e) => e.stopPropagation()} className="max-h-full w-full max-w-[760px] animate-[sheet-in_.22s_ease-out] overflow-y-auto rounded-t-2xl border border-line bg-surface p-5 shadow-pop sm:rounded-2xl">
        <div className="flex items-center gap-3">
          <button aria-label="Volver" onClick={onClose} className="-ml-2 flex h-11 w-11 items-center justify-center rounded-lg text-brand hover:bg-canvas"><Icon name="arrowL" size={18} strokeWidth={2.2} /></button>
          <Icon name="file" size={16} className="shrink-0 text-muted" />
          <h2 id={titleId} className="min-w-0 flex-1 truncate font-mono text-sm font-semibold">{m.path}</h2>
          <RiskPill level={m.level} size="md" />
          <button ref={closeBtn} aria-label="Cerrar" onClick={onClose} className="-mr-2 flex h-11 w-11 items-center justify-center rounded-lg text-soft hover:bg-canvas"><Icon name="close" size={16} strokeWidth={2.2} /></button>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-[0.8fr_1.4fr]">
          <section className="rounded-xl border border-line p-4">
            <h3 className="mb-2 text-[13px] font-bold">Resumen</h3>
            <dl>
              {summary.map(([k, v]) => (
                <div key={k} className="flex justify-between border-t border-line py-2 text-xs"><dt className="text-soft">{k}</dt><dd className="font-semibold tabular-nums">{v}</dd></div>
              ))}
            </dl>
          </section>
          <section className="min-w-0 rounded-xl border border-line p-4">
            <h3 className="mb-2 text-[13px] font-bold">Recomendaciones</h3>
            {m.justification && <p className="mb-3 rounded-md bg-canvas px-3 py-2 text-xs leading-relaxed text-soft">{m.justification}</p>}
            {m.recommendations && m.recommendations.length > 0 ? (
              <ol className="flex flex-col gap-3">
                {m.recommendations.map((r) => (
                  <li key={r.factor + r.action} className="text-xs leading-relaxed">
                    <div className="mb-1 flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${PRIORITY_STYLE[r.priority]}`}>{r.priority}</span>
                      <span className="font-semibold capitalize text-ink">{r.factor}</span>
                    </div>
                    <p className="text-ink">{r.action}</p>
                    {r.reason && <p className="mt-1 text-xs text-muted">Por qué: {r.reason}</p>}
                  </li>
                ))}
              </ol>
            ) : m.actions.length === 0 ? <p className="text-xs text-muted">Sin recomendaciones para este módulo.</p> : (
              <ul className="flex flex-col gap-2">
                {m.actions.map((a) => <li key={a} className="flex gap-2.5 text-xs leading-relaxed text-soft"><span className="text-brand" aria-hidden="true">•</span>{a}</li>)}
              </ul>
            )}
          </section>
        </div>

        <SonarSection module={m} />

        {m.commits.length > 0 && (
          <section className="mt-4 rounded-xl border border-line p-4">
            <h3 className="mb-1 text-[13px] font-bold">Historial de cambios</h3>
            <ul>
              {m.commits.map((c) => (
                <li key={c.hash + c.message} className="flex items-center gap-3 border-t border-line py-2.5 text-xs">
                  <code className="rounded bg-canvas px-1.5 py-0.5 text-xs">{c.hash}</code>
                  <span className="min-w-0 flex-1 truncate">{c.message}</span>
                  <span className="text-xs text-muted">{c.when}</span>
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
