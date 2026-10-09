import { describe, expect, it } from 'vitest'
import { normalizeModule, normalizePriority, normalizeRepo } from './normalize'

describe('normalizeModule', () => {
  it('lee nombres de campo alternativos y clasifica por puntaje cuando falta el nivel', () => {
    const m = normalizeModule({ file: 'src/a.py', risk_score: 82, metrics: { complexity: 40, loc: 900 }, deficiencies: ['x', 'y'] })
    expect(m.path).toBe('src/a.py')
    expect(m.level).toBe('HIGH')
    expect(m.cc).toBe(40)
    expect(m.loc).toBe(900)
    expect(m.deficiencies).toBe(2)
  })

  it('respeta el nivel que entrega la API', () => {
    expect(normalizeModule({ file_path: 'b.py', risk_score: 90, risk_level: 'LOW' }).level).toBe('LOW')
  })

  it('no rompe con respuestas vacías', () => {
    const m = normalizeModule({})
    expect(m.path).toBe('desconocido')
    expect(m.score).toBe(0)
    expect(m.level).toBe('LOW')
  })
})

describe('normalizePriority', () => {
  it('acepta lista directa o envuelta', () => {
    expect(normalizePriority([{ file: 'a' }])).toHaveLength(1)
    expect(normalizePriority({ priority_list: [{ file: 'a' }, { file: 'b' }] })).toHaveLength(2)
    expect(normalizePriority({})).toEqual([])
  })
})

describe('normalizeRepo', () => {
  it('calcula conteos a partir de porcentajes y nombra el repo por su carpeta', () => {
    const s = normalizeRepo({ total_modules: 40, high_risk_modules: 4, high_risk_percentage: 10, medium_risk_percentage: 30, low_risk_percentage: 60, average_risk_score: 47.6 }, 'C:\\repos\\orion\\')
    expect(s.name).toBe('orion')
    expect(s.avgScore).toBe(48)
    expect(s.counts).toEqual({ high: 4, medium: 12, low: 24 })
  })
})
