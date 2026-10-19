import type { Cell, Sheet } from './xlsx'
import type { Deficiency, ModuleRow, RiskLevel } from './types'
import { LEVEL_LABEL } from './risk'

const SEVERITY_LABEL: Record<Deficiency['severity'], string> = { CRITICAL: 'Crítica', HIGH: 'Alta', MEDIUM: 'Media' }
const LEVELS: RiskLevel[] = ['HIGH', 'MEDIUM', 'LOW']
const LEVEL_STYLE = { HIGH: 'high', MEDIUM: 'med', LOW: 'low' } as const

export interface ReportData {
  repo: string
  generated: string
  mods: ModuleRow[]
  total: number
  avg: number
  counts: Record<RiskLevel, number>
  deficiencies: number
  /** Una fila por deficiencia, con el módulo al que pertenece. */
  defRows: { path: string; level: RiskLevel; d: Deficiency }[]
}

export function buildReport(mods: ModuleRow[], repo: string, now = new Date()): ReportData {
  const sorted = [...mods].sort((a, b) => b.score - a.score)
  const counts: Record<RiskLevel, number> = { HIGH: 0, MEDIUM: 0, LOW: 0 }
  for (const m of sorted) counts[m.level]++
  const defRows = sorted.flatMap((m) => (m.deficiencyList ?? []).map((d) => ({ path: m.path, level: m.level, d })))
  return {
    repo,
    generated: now.toLocaleString('es-GT', { dateStyle: 'long', timeStyle: 'short' }),
    mods: sorted,
    total: sorted.length,
    avg: sorted.length ? Math.round(sorted.reduce((a, m) => a + m.score, 0) / sorted.length) : 0,
    counts,
    deficiencies: sorted.reduce((a, m) => a + m.deficiencies, 0),
    defRows,
  }
}

/** Acción principal para el módulo: la primera recomendación o, si no hay, la primera acción. */
function mainAction(m: ModuleRow): string {
  return m.recommendations?.[0]?.action ?? m.actions[0] ?? ''
}

const defSummary = (m: ModuleRow) =>
  (m.deficiencyList ?? []).map((d) => `${d.fn ? d.fn + ': ' : ''}${d.label}`).join('; ')

export function fileStamp(repo: string, ext: string): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${repo}_riesgo_${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}.${ext}`
}

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

/* ---------------------------------- CSV ---------------------------------- */

const CSV_HEADERS = ['Módulo', 'Riesgo', 'Puntaje', 'Complejidad (CC)', 'Cambios (commits)', 'Líneas', 'Bus factor (%)', 'Deficiencias', 'Detalle de deficiencias', 'Acción principal']

export function exportCsv(mods: ModuleRow[], repo: string): string {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`
  const rows = buildReport(mods, repo).mods.map((m) => [m.path, LEVEL_LABEL[m.level], m.score, m.cc, m.churn, m.loc, m.busFactor, m.deficiencies, defSummary(m), mainAction(m)])
  const csv = [CSV_HEADERS, ...rows].map((r) => r.map(esc).join(',')).join('\r\n')
  const name = fileStamp(repo, 'csv')
  download(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }), name)
  return name
}

/* --------------------------------- Excel --------------------------------- */

export function workbookSheets(r: ReportData): Sheet[] {
  const pct = (n: number) => (r.total ? Math.round((n / r.total) * 100) : 0)
  const levelCell = (l: RiskLevel): Cell => ({ v: LEVEL_LABEL[l], s: LEVEL_STYLE[l] })

  const summary: Sheet = {
    name: 'Resumen',
    widths: [30, 16, 16, 16, 16, 16],
    merges: ['A1:F1', 'A2:F2'],
    heights: { 1: 30, 5: 20, 6: 34 },
    rows: [
      [{ v: `Informe de mantenibilidad: ${r.repo}`, s: 'title' }],
      [{ v: `Generado el ${r.generated} con CodeVitals`, s: 'subtitle' }],
      [],
      [{ v: 'Indicadores', s: 'section' }, { v: '', s: 'section' }, { v: '', s: 'section' }, { v: '', s: 'section' }, { v: '', s: 'section' }, { v: '', s: 'section' }],
      ['Módulos', 'Riesgo promedio', 'Riesgo alto', 'Riesgo medio', 'Riesgo bajo', 'Deficiencias'].map((v): Cell => ({ v, s: 'kpiLabel' })),
      [r.total, r.avg, r.counts.HIGH, r.counts.MEDIUM, r.counts.LOW, r.deficiencies].map((v): Cell => ({ v, s: 'kpiValue' })),
      [],
      [{ v: 'Distribución por nivel', s: 'section' }, { v: '', s: 'section' }, { v: '', s: 'section' }],
      ['Nivel', 'Módulos', '% del total'].map((v): Cell => ({ v, s: 'header' })),
      ...LEVELS.map((l): Cell[] => [levelCell(l), { v: r.counts[l], s: 'center' }, { v: `${pct(r.counts[l])}%`, s: 'center' }]),
      [],
      [{ v: 'Módulos que conviene atender primero', s: 'section' }, { v: '', s: 'section' }, { v: '', s: 'section' }, { v: '', s: 'section' }, { v: '', s: 'section' }, { v: '', s: 'section' }],
      ['Módulo', 'Riesgo', 'Puntaje', 'CC', 'Deficiencias', 'Cambios'].map((v): Cell => ({ v, s: 'header' })),
      ...r.mods.slice(0, 5).map((m): Cell[] => [{ v: m.path, s: 'text' }, levelCell(m.level), { v: m.score, s: 'center' }, { v: m.cc, s: 'center' }, { v: m.deficiencies, s: 'center' }, { v: m.churn, s: 'center' }]),
      [],
      [{ v: 'El puntaje (0 a 100) combina complejidad, frecuencia de cambios, tamaño, duplicación y bus factor. Bajo: menos de 40. Medio: de 40 a 69. Alto: 70 o más.', s: 'note' }],
    ],
  }
  summary.merges!.push(`A${summary.rows.length}:F${summary.rows.length}`)
  summary.heights![summary.rows.length] = 34

  const modHeader = ['Módulo', 'Riesgo', 'Puntaje', 'Complejidad (CC)', 'Cambios (commits)', 'Líneas', 'Bus factor (%)', 'Deficiencias', 'Acción principal'].map((v): Cell => ({ v, s: 'header' }))
  const modules: Sheet = {
    name: 'Módulos',
    widths: [46, 11, 16, 15, 16, 10, 14, 13, 60],
    freezeRows: 1,
    filterRow: 1,
    heights: { 1: 34 },
    dataBars: r.mods.length ? [`C2:C${r.mods.length + 1}`] : [],
    rows: [
      modHeader,
      ...r.mods.map((m): Cell[] => [
        { v: m.path, s: 'text' }, levelCell(m.level), { v: m.score, s: 'center' }, { v: m.cc, s: 'center' }, { v: m.churn, s: 'center' },
        { v: m.loc, s: 'center' }, { v: m.busFactor, s: 'center' }, { v: m.deficiencies, s: 'center' }, { v: mainAction(m), s: 'text' },
      ]),
    ],
  }

  const sheets = [summary, modules]
  if (r.defRows.length) {
    sheets.push({
      name: 'Deficiencias',
      widths: [40, 24, 26, 11, 52, 52],
      freezeRows: 1,
      filterRow: 1,
      heights: { 1: 34 },
      rows: [
        ['Módulo', 'Función', 'Problema', 'Gravedad', 'Detalle', 'Cómo corregirlo'].map((v): Cell => ({ v, s: 'header' })),
        ...r.defRows.map(({ path, d }): Cell[] => [
          { v: path, s: 'wrap' }, { v: d.fn || 'Todo el archivo', s: 'wrap' }, { v: d.label, s: 'wrap' },
          { v: SEVERITY_LABEL[d.severity], s: d.severity === 'CRITICAL' ? 'high' : d.severity === 'HIGH' ? 'med' : 'center' },
          { v: d.detail, s: 'wrap' }, { v: d.advice, s: 'wrap' },
        ]),
      ],
    })
  }
  return sheets
}

export async function exportXlsx(mods: ModuleRow[], repo: string): Promise<string> {
  const { buildWorkbook } = await import('./xlsx')
  const bytes = buildWorkbook(workbookSheets(buildReport(mods, repo)))
  const name = fileStamp(repo, 'xlsx')
  download(
    new Blob([bytes as unknown as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    name,
  )
  return name
}

/* ----------------------- Informe imprimible (PDF) ------------------------ */

const h = (s: string | number) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string)
const LEVEL_COLOR: Record<RiskLevel, { fg: string; bg: string; bar: string }> = {
  HIGH: { fg: '#b91c1c', bg: '#fee2e2', bar: '#dc2626' },
  MEDIUM: { fg: '#b45309', bg: '#fef3c7', bar: '#f59e0b' },
  LOW: { fg: '#15803d', bg: '#dcfce7', bar: '#22c55e' },
}

/** HTML del informe: pensado para imprimirse o guardarse como PDF desde el navegador (hoja A4). */
export function reportHtml(r: ReportData): string {
  const pill = (l: RiskLevel) => `<span class="pill" style="color:${LEVEL_COLOR[l].fg};background:${LEVEL_COLOR[l].bg}">${LEVEL_LABEL[l]}</span>`
  const share = (l: RiskLevel) => (r.total ? (r.counts[l] / r.total) * 100 : 0)
  const bar = LEVELS.map((l) => `<span style="width:${share(l)}%;background:${LEVEL_COLOR[l].bar}"></span>`).join('')
  const legend = LEVELS.map((l) => `<span><i style="background:${LEVEL_COLOR[l].bar}"></i>${LEVEL_LABEL[l]}: <b>${r.counts[l]}</b></span>`).join('')
  const top = r.mods.slice(0, 15)
  const focus = r.mods.filter((m) => m.level === 'HIGH' && (m.deficiencyList?.length ?? 0) > 0).slice(0, 8)

  const focusHtml = focus
    .map(
      (m) => `<section class="mod"><h3><code>${h(m.path)}</code> ${pill(m.level)} <small>puntaje ${m.score}</small></h3>
      <ul>${(m.deficiencyList ?? []).slice(0, 6).map((d) => `<li><b>${h(d.label)}</b>${d.fn ? ` en <code>${h(d.fn)}()</code>` : ''}. ${h(d.detail)}<br><span class="adv">Cómo corregirlo: ${h(d.advice)}</span></li>`).join('')}</ul></section>`,
    )
    .join('')

  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Informe de mantenibilidad: ${h(r.repo)}</title>
<style>
@page{size:A4;margin:16mm 14mm}
*{box-sizing:border-box}body{font:13px/1.5 "Segoe UI",system-ui,sans-serif;color:#1f2937;margin:0;background:#fff}
.cover{border-left:6px solid #4c2fbf;padding:4px 0 4px 16px;margin-bottom:22px}
.cover small{color:#6b7280;font-size:12px}.cover h1{margin:2px 0 4px;font-size:26px;color:#111827;letter-spacing:-.4px}
.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:18px}
.kpi{border:1px solid #e5e7eb;border-radius:10px;padding:10px 12px}.kpi span{display:block;color:#6b7280;font-size:11px}.kpi b{font-size:24px;color:#111827}
.dist{margin:6px 0 22px}.dist .bar{display:flex;height:14px;border-radius:7px;overflow:hidden;background:#f3f4f6}.dist .bar span{display:block}
.dist .lg{display:flex;gap:18px;margin-top:8px;font-size:12px;color:#4b5563}.dist .lg i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:6px}
h2{font-size:15px;margin:22px 0 8px;padding-bottom:5px;border-bottom:2px solid #ede9fe;color:#3b2a8f;break-after:avoid}
table{width:100%;border-collapse:collapse;font-size:12px}th{background:#3b2a8f;color:#fff;text-align:left;padding:7px 8px;font-weight:600}
td{padding:6px 8px;border-bottom:1px solid #e5e7eb;vertical-align:top}tr{break-inside:avoid}tbody tr:nth-child(even) td{background:#faf9ff}
td.n,th.n{text-align:center}code{font:11.5px Consolas,monospace;word-break:break-all}
.pill{display:inline-block;border-radius:999px;padding:1px 9px;font-size:11px;font-weight:600}
.mod{border:1px solid #e5e7eb;border-radius:10px;padding:10px 14px;margin-bottom:10px;break-inside:avoid}.mod h3{margin:0 0 6px;font-size:13px}.mod h3 small{color:#6b7280;font-weight:400}
.mod ul{margin:0;padding-left:18px}.mod li{margin:4px 0}.adv{color:#6b7280;font-size:12px}
.note{margin-top:22px;padding:10px 14px;background:#f5f3ff;border-radius:10px;color:#4b5563;font-size:12px}
.foot{margin-top:16px;color:#9ca3af;font-size:11px;text-align:center}
@media print{.noprint{display:none}}
.noprint{position:fixed;right:16px;top:16px}.noprint button{background:#4c2fbf;color:#fff;border:0;border-radius:8px;padding:9px 16px;font:600 13px system-ui;cursor:pointer}
</style></head><body>
<div class="noprint"><button onclick="window.print()">Imprimir o guardar como PDF</button></div>
<div class="cover"><small>Informe de mantenibilidad · CodeVitals</small><h1>${h(r.repo)}</h1><small>Generado el ${h(r.generated)}</small></div>
<div class="kpis">
<div class="kpi"><span>Módulos analizados</span><b>${r.total}</b></div>
<div class="kpi"><span>Riesgo promedio</span><b>${r.avg}</b></div>
<div class="kpi"><span>Riesgo alto</span><b style="color:#b91c1c">${r.counts.HIGH}</b></div>
<div class="kpi"><span>Deficiencias</span><b>${r.deficiencies}</b></div>
</div>
<div class="dist"><div class="bar">${bar}</div><div class="lg">${legend}</div></div>
<h2>Módulos que conviene atender primero</h2>
<table><thead><tr><th>Módulo</th><th>Riesgo</th><th class="n">Puntaje</th><th class="n">CC</th><th class="n">Cambios</th><th class="n">Bus factor</th><th class="n">Deficiencias</th></tr></thead><tbody>
${top.map((m) => `<tr><td><code>${h(m.path)}</code></td><td>${pill(m.level)}</td><td class="n"><b>${m.score}</b></td><td class="n">${m.cc}</td><td class="n">${m.churn}</td><td class="n">${m.busFactor}%</td><td class="n">${m.deficiencies}</td></tr>`).join('')}
</tbody></table>
${r.mods.length > top.length ? `<p class="adv">Se muestran los ${top.length} módulos de mayor puntaje de ${r.total}.</p>` : ''}
${focus.length ? `<h2>Deficiencias de los módulos de riesgo alto</h2>${focusHtml}` : ''}
<div class="note">El puntaje (0 a 100) combina complejidad ciclomática, frecuencia de cambios, tamaño, duplicación y bus factor. Bajo: menos de 40. Medio: de 40 a 69. Alto: 70 o más. Es una guía para priorizar la revisión, no un juicio sobre la calidad del equipo.</div>
<div class="foot">CodeVitals · análisis de métricas de código en repositorios Git</div>
</body></html>`
}

/** Abre el informe en una pestaña nueva listo para imprimir. Si el navegador bloquea la ventana, lo descarga como HTML. */
export function exportPdf(mods: ModuleRow[], repo: string): string {
  const html = reportHtml(buildReport(mods, repo))
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const w = window.open(url, '_blank')
  if (!w) {
    download(blob, fileStamp(repo, 'html').replace('_riesgo_', '_informe_'))
    URL.revokeObjectURL(url)
    return fileStamp(repo, 'html').replace('_riesgo_', '_informe_')
  }
  w.addEventListener('load', () => setTimeout(() => w.print(), 400))
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
  return fileStamp(repo, 'pdf').replace('_riesgo_', '_informe_')
}
