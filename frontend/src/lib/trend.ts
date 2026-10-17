export interface Trend {
  previous: number
  current: number
  delta: number
  direction: 'up' | 'down' | 'flat'
  /** Puntos para un <polyline> con viewBox 0 0 120 36. */
  points: string
}

/** Resume una serie de puntajes promedio (del más antiguo al más reciente). null si hay menos de 2. */
export function trendOf(series: number[]): Trend | null {
  if (series.length < 2) return null
  const cur = series[series.length - 1]
  const prev = series[series.length - 2]
  const delta = Math.round((cur - prev) * 10) / 10
  const lo = Math.min(...series), hi = Math.max(...series)
  const span = hi - lo || 1
  const points = series
    .map((v, i) => `${((i * 120) / (series.length - 1)).toFixed(1)},${(32 - ((v - lo) / span) * 28).toFixed(1)}`)
    .join(' ')
  return { previous: Math.round(prev * 10) / 10, current: Math.round(cur * 10) / 10, delta, direction: delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat', points }
}
