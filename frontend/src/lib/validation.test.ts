import { describe, expect, it } from 'vitest'
import { formatP, normalizeValidation, parseRepoUrls, strengthLabel, validationCsv } from './validation'

const RAW = {
  n_modules: 452, alpha: 0.05, sufficient_sample: true,
  descriptives: { risk_score: { label: 'Puntaje de riesgo', n: 452, mean: 40.1, median: 38, std: 12, min: 3, max: 90 } },
  spearman: [{ variable: 'bus_factor', label: 'Bus factor', n: 452, rho: 0.31, p_value: 0.0000001, significant: true, interpretation: 'x' }],
  chi_square: [{ variable: 'bus_factor', label: 'Bus factor', n: 452, chi2: 14.2, p_value: 0.0045, dof: 4, cramers_v: 0.12, significant: true, low_expected_warning: false, interpretation: 'y' }],
  repositories: [{ repo_url: 'https://github.com/a/b', modules: 6, total_commits: 40 }],
  failed: [{ repo_url: 'https://github.com/x/y', error: 'no existe' }], note: 'nota', saved: true,
}

describe('validation', () => {
  it('normaliza la respuesta de la API', () => {
    const v = normalizeValidation(RAW)
    expect(v.nModules).toBe(452)
    expect(v.spearman[0].pValue).toBe(0.0000001)
    expect(v.chiSquare[0].cramersV).toBe(0.12)
    expect(v.repositories[0].totalCommits).toBe(40)
    expect(v.failed[0].error).toBe('no existe')
  })
  it('tolera respuestas vacías o nulas', () => {
    const v = normalizeValidation(null)
    expect(v.spearman).toEqual([])
    expect(v.alpha).toBe(0.05)
  })
  it('formatea p y fuerza', () => {
    expect(formatP(0.0000001)).toBe('< 0.001')
    expect(formatP(0.0452)).toBe('0.045')
    expect(formatP(null)).toBe('—')
    expect(strengthLabel(0.45)).toBe('Moderada positiva')
    expect(strengthLabel(-0.8)).toBe('Muy fuerte negativa')
    expect(strengthLabel(0.02)).toBe('Nula')
  })
  it('separa y deduplica URLs', () => {
    expect(parseRepoUrls('a\n b \n\na,c')).toEqual(['a', 'b', 'c'])
  })
  it('genera CSV con ambas pruebas', () => {
    const lines = validationCsv(normalizeValidation(RAW)).split('\r\n')
    expect(lines).toHaveLength(3)
    expect(lines[1]).toContain('Spearman')
    expect(lines[2]).toContain('Chi-cuadrado')
  })
})

describe('isRepoRef', () => {
  it('acepta URLs y carpetas locales ya clonadas', async () => {
    const { isRepoRef } = await import('./validation')
    expect(isRepoRef('https://github.com/a/b')).toBe(true)
    expect(isRepoRef('local:mi-proyecto')).toBe(true)
    expect(isRepoRef('/etc/passwd')).toBe(false)
  })
})
