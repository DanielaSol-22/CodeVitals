import { Link } from 'react-router-dom'
import type { ModuleRow } from '../lib/types'
import { levelFromScore } from '../lib/risk'

type Rect = { x: number; y: number; w: number; h: number }
type Item = { m: ModuleRow; size: number }

/** Treemap "squarified": área = líneas de código, color = nivel de riesgo, intensidad = puntaje. */
function layout(items: Item[], r: Rect): (Rect & { m: ModuleRow })[] {
  const out: (Rect & { m: ModuleRow })[] = []
  const total = items.reduce((a, i) => a + i.size, 0)
  if (!total) return out
  let rest = items.map((i) => ({ ...i, a: (i.size / total) * r.w * r.h }))
  let box = { ...r }
  const worst = (row: typeof rest, side: number) => {
    const s = row.reduce((a, i) => a + i.a, 0)
    const mx = Math.max(...row.map((i) => i.a)), mn = Math.min(...row.map((i) => i.a))
    return Math.max((side * side * mx) / (s * s), (s * s) / (side * side * mn))
  }
  while (rest.length) {
    const side = Math.min(box.w, box.h)
    let row = [rest[0]]
    let k = 1
    while (k < rest.length && worst([...row, rest[k]], side) <= worst(row, side)) { row.push(rest[k]); k++ }
    const s = row.reduce((a, i) => a + i.a, 0)
    if (box.w >= box.h) {
      const w = s / box.h; let y = box.y
      row.forEach((i) => { const h = i.a / w; out.push({ x: box.x, y, w, h, m: i.m }); y += h })
      box = { x: box.x + w, y: box.y, w: box.w - w, h: box.h }
    } else {
      const h = s / box.w; let x = box.x
      row.forEach((i) => { const w = i.a / h; out.push({ x, y: box.y, w, h, m: i.m }); x += w })
      box = { x: box.x, y: box.y + h, w: box.w, h: box.h - h }
    }
    rest = rest.slice(k)
  }
  return out
}

const BAR = { LOW: 'var(--color-risk-low-bar)', MEDIUM: 'var(--color-risk-med-bar)', HIGH: 'var(--color-risk-high-bar)' }

export function RiskMap({ modules, height = 340 }: { modules: ModuleRow[]; height?: number }) {
  const useLoc = modules.some((m) => m.loc > 0)
  const items = [...modules].map((m) => ({ m, size: Math.max(1, useLoc ? m.loc : m.score) })).sort((a, b) => b.size - a.size)
  const cells = layout(items, { x: 0, y: 0, w: 100, h: 100 })
  return (
    <div className="relative w-full overflow-hidden rounded-xl bg-table" style={{ height }} role="group" aria-label={`Mapa de riesgo de ${modules.length} módulos: el área es ${useLoc ? 'el tamaño en líneas' : 'el puntaje'} y el color es el nivel`}>
      {cells.map(({ x, y, w, h, m }) => {
        const bar = BAR[levelFromScore(m.score)]
        const big = w > 12 && h > 14
        return (
          <Link
            key={m.path}
            to={`/modulos?modulo=${encodeURIComponent(m.path)}`}
            title={`${m.path} · puntaje ${Math.round(m.score)}${useLoc ? ` · ${m.loc} líneas` : ''}`}
            className="absolute overflow-hidden border border-canvas p-1.5 transition-[filter] hover:brightness-95 focus-visible:z-10"
            style={{ left: `${x}%`, top: `${y}%`, width: `${w}%`, height: `${h}%`, background: `color-mix(in srgb, ${bar} ${28 + Math.round(m.score * 0.5)}%, var(--color-surface))` }}
          >
            {big && (
              <span className="block leading-tight">
                <span className="font-code block truncate text-[11px] font-medium text-ink">{m.path.split('/').pop()}</span>
                <span className="font-display text-sm font-bold tabular-nums text-ink">{Math.round(m.score)}</span>
              </span>
            )}
          </Link>
        )
      })}
    </div>
  )
}
