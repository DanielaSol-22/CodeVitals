export interface RealPoint { label: string; score: number; complexity: number; duplication: number; loc: number; churn: number }

/* eslint-disable @typescript-eslint/no-explicit-any */
const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0)
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

export function shortDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${p(d.getHours())}:${p(d.getMinutes())}`
}

export function normalizeHistory(raw: any): RealPoint[] {
  const list: any[] = Array.isArray(raw?.history) ? raw.history : []
  return list.map((h) => ({
    label: shortDate(String(h.fecha_analisis ?? '')),
    score: num(h.average_risk_score), complexity: num(h.average_complexity), duplication: num(h.average_duplication),
    loc: num(h.average_loc), churn: num(h.average_churn),
  }))
}

/** Techo "redondo" para el eje Y (10, 20, 50, 100, 200, 500…). */
export function niceMax(values: number[]): number {
  const m = Math.max(0, ...values)
  if (m <= 1) return 1
  const pow = 10 ** Math.floor(Math.log10(m))
  for (const f of [1, 2, 5, 10]) if (m <= f * pow) return f * pow
  return 10 * pow
}
