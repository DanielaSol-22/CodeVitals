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

describe('normalizeRecommendations', () => {
  it('lee recomendaciones específicas con prioridad y motivo', async () => {
    const { normalizeModule } = await import('./normalize')
    const m = normalizeModule({
      file_path: 'a.py', risk_score: 80, classification: 'HIGH',
      justification: 'Factores de riesgo detectados: complejidad ciclomática elevada (CC 44).',
      recommendations: [
        { factor: 'complejidad', priority: 'ALTA', action: 'Dividir parse (24).', reason: '2 de 3 funciones superan CC 10.' },
        { factor: 'x', priority: 'rara', action: 'Otra.' },
        { nada: true },
      ],
    })
    expect(m.justification).toContain('CC 44')
    expect(m.recommendations).toHaveLength(2)
    expect(m.recommendations?.[0]).toMatchObject({ priority: 'ALTA', reason: '2 de 3 funciones superan CC 10.' })
    expect(m.recommendations?.[1].priority).toBe('MEDIA')
  })

  it('sin recomendaciones devuelve lista vacía', async () => {
    const { normalizeModule } = await import('./normalize')
    expect(normalizeModule({ file_path: 'a.py', risk_score: 10 }).recommendations).toEqual([])
  })
})

describe('métricas alineadas con la investigación', () => {
  it('separa frecuencia de modificaciones, churn en líneas y complejidad cognitiva', () => {
    const m = normalizeModule({
      file_path: 'a.py', risk_score: 50, classification: 'MEDIUM',
      churn_commits: 12, code_churn_lines: 340, cognitive_complexity: 21,
    })
    expect(m.churn).toBe(12)
    expect(m.churnLines).toBe(340)
    expect(m.cognitive).toBe(21)
  })
  it('la complejidad cognitiva es null cuando no aplica (otros lenguajes)', () => {
    expect(normalizeModule({ file_path: 'a.js', risk_score: 10, cognitive_complexity: null }).cognitive).toBeNull()
  })
})
