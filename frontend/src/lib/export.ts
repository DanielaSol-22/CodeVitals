import type { ModuleRow } from './types'
import { LEVEL_LABEL } from './risk'

const HEADERS = ['Módulo', 'Riesgo', 'Puntaje', 'Complejidad (CC)', 'Churn', 'Líneas', 'Bus factor', 'Deficiencias']

function rowsOf(mods: ModuleRow[]): (string | number)[][] {
  return mods.map((m) => [m.path, LEVEL_LABEL[m.level], m.score, m.cc, m.churn, m.loc, m.busFactor, m.deficiencies])
}

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

export function exportCsv(mods: ModuleRow[], repo: string): string {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`
  const csv = [HEADERS, ...rowsOf(mods)].map((r) => r.map(esc).join(',')).join('\r\n')
  const name = fileStamp(repo, 'csv')
  download(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }), name)
  return name
}

export async function exportXlsx(mods: ModuleRow[], repo: string): Promise<string> {
  const { buildXlsx } = await import('./xlsx')
  const bytes = buildXlsx('Riesgo', [HEADERS, ...rowsOf(mods)], [42, 10, 9, 16, 8, 8, 11, 13])
  const name = fileStamp(repo, 'xlsx')
  download(
    new Blob([bytes as unknown as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    name,
  )
  return name
}
