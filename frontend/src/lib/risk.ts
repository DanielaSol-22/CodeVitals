import type { ComponentScores, RiskLevel } from './types'

export const LEVEL_LABEL: Record<RiskLevel, string> = { LOW: 'Bajo', MEDIUM: 'Medio', HIGH: 'Alto' }

export const LEVEL_CLASS: Record<RiskLevel, { pill: string; dot: string; bar: string }> = {
  LOW: { pill: 'bg-risk-low-bg text-risk-low-fg', dot: 'bg-risk-low-bar', bar: 'var(--color-risk-low-bar)' },
  MEDIUM: { pill: 'bg-risk-med-bg text-risk-med-fg', dot: 'bg-risk-med-bar', bar: 'var(--color-risk-med-bar)' },
  HIGH: { pill: 'bg-risk-high-bg text-risk-high-fg', dot: 'bg-risk-high-bar', bar: 'var(--color-risk-high-bar)' },
}

export function levelFromScore(score: number): RiskLevel {
  if (score >= 70) return 'HIGH'
  if (score >= 40) return 'MEDIUM'
  return 'LOW'
}

export function scoreWord(score: number): string {
  const l = levelFromScore(score)
  return l === 'HIGH' ? 'riesgo alto' : l === 'MEDIUM' ? 'riesgo medio' : 'riesgo bajo'
}

/** Color de relleno (gráficos, barras, puntos). Para texto usa scoreText. */
export function scoreColor(score: number): string {
  const l = levelFromScore(score)
  return l === 'HIGH' ? 'var(--color-risk-high-bar)' : l === 'MEDIUM' ? 'var(--color-risk-med-bar)' : 'var(--color-risk-low-bar)'
}

/** Color de texto con contraste AA sobre superficie en ambos temas. */
export function scoreText(score: number): string {
  const l = levelFromScore(score)
  return l === 'HIGH' ? 'var(--color-risk-high)' : l === 'MEDIUM' ? 'var(--color-risk-med)' : 'var(--color-risk-low)'
}

/** Pesos de la fórmula (iguales a los del backend). */
export const FACTOR_WEIGHT: Record<keyof ComponentScores, number> = {
  complexity: 0.375, churn: 0.275, loc: 0.175, duplication: 0.125, busFactor: 0.125,
}
export const FACTOR_LABEL: Record<keyof ComponentScores, string> = {
  complexity: 'Complejidad', churn: 'Cambios frecuentes', loc: 'Tamaño', duplication: 'Duplicación', busFactor: 'Bus factor',
}
/** Color de serie por componente (tokens: cambian con el tema). */
export const FACTOR_COLOR: Record<keyof ComponentScores, string> = {
  complexity: 'var(--color-chart-complexity)', churn: 'var(--color-chart-churn)', loc: 'var(--color-chart-loc)',
  duplication: 'var(--color-chart-duplication)', busFactor: 'var(--color-chart-busfactor)',
}

/** Componente que más aporta al puntaje (puntaje × peso). null si no hay datos por componente. */
export function mainFactor(scores: ComponentScores): keyof ComponentScores | null {
  let best: keyof ComponentScores | null = null
  let bestVal = 0
  for (const k of Object.keys(FACTOR_WEIGHT) as (keyof ComponentScores)[]) {
    const v = (scores?.[k] ?? 0) * FACTOR_WEIGHT[k]
    if (v > bestVal) { bestVal = v; best = k }
  }
  return best
}
