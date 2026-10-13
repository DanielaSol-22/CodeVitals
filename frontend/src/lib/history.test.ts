import { describe, expect, it } from 'vitest'
import { niceMax, normalizeHistory } from './history'

describe('history', () => {
  it('normaliza puntos y tolera datos faltantes', () => {
    const p = normalizeHistory({ history: [{ fecha_analisis: '2026-10-10T15:24:00', average_risk_score: 41.2, average_loc: 120 }] })
    expect(p).toHaveLength(1)
    expect(p[0].score).toBe(41.2)
    expect(p[0].complexity).toBe(0)
    expect(p[0].label).toMatch(/10 oct/)
    expect(normalizeHistory(null)).toEqual([])
  })
  it('calcula un techo redondo', () => {
    expect(niceMax([3, 7])).toBe(10)
    expect(niceMax([12, 40])).toBe(50)
    expect(niceMax([130])).toBe(200)
    expect(niceMax([0])).toBe(1)
  })
})
