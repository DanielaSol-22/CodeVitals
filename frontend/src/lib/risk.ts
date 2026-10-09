import type { RiskLevel } from './types'

export const LEVEL_LABEL: Record<RiskLevel, string> = { LOW: 'Bajo', MEDIUM: 'Medio', HIGH: 'Alto' }

export const LEVEL_CLASS: Record<RiskLevel, { pill: string; dot: string; bar: string }> = {
  LOW: { pill: 'bg-risk-low-bg text-risk-low-fg', dot: 'bg-risk-low', bar: '#4caf7d' },
  MEDIUM: { pill: 'bg-risk-med-bg text-risk-med-fg', dot: 'bg-risk-med', bar: '#fbc558' },
  HIGH: { pill: 'bg-risk-high-bg text-risk-high-fg', dot: 'bg-risk-high', bar: '#f28c8c' },
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

export function scoreColor(score: number): string {
  const l = levelFromScore(score)
  return l === 'HIGH' ? '#e04d4d' : l === 'MEDIUM' ? '#f7a823' : '#2f9e63'
}
