import { describe, expect, it } from 'vitest'
import {
  defaultProjectKey, findSonarFile, formatDebt, normalizeSonarCompare, normalizeSonarFiles, normalizeSonarStatus,
} from './sonar'

describe('defaultProjectKey', () => {
  it('usa el nombre del repositorio', () => {
    expect(defaultProjectKey('https://github.com/Delgan/loguru')).toBe('loguru')
    expect(defaultProjectKey('https://github.com/Delgan/loguru.git/')).toBe('loguru')
    expect(defaultProjectKey('local:mi carpeta')).toBe('mi-carpeta')
    expect(defaultProjectKey('')).toBe('')
  })
})

describe('findSonarFile', () => {
  const files = normalizeSonarFiles({ files: [{ path: 'loguru/_logger.py', measures: { code_smells: 4, sqale_index: 95 } }] })
  it('empareja por igualdad y por sufijo', () => {
    expect(findSonarFile(files, 'loguru/_logger.py')?.smells).toBe(4)
    expect(findSonarFile(files, 'repos/loguru/loguru/_logger.py')?.debtMinutes).toBe(95)
    expect(findSonarFile(files, 'otro.py')).toBeUndefined()
  })
})

describe('formatDebt', () => {
  it('formatea minutos, horas y días', () => {
    expect(formatDebt(null)).toBe('—')
    expect(formatDebt(45)).toBe('45 min')
    expect(formatDebt(200)).toBe('3 h 20 min')
    expect(formatDebt(120)).toBe('2 h')
    expect(formatDebt(8 * 60 * 2 + 60)).toBe('2 d 1 h')
  })
})

describe('normalizadores', () => {
  it('estado', () => {
    expect(normalizeSonarStatus({ configured: true, reachable: true, status: 'UP', version: '10.6' }))
      .toMatchObject({ configured: true, reachable: true, status: 'UP' })
    expect(normalizeSonarStatus(null)).toMatchObject({ configured: false, reachable: false })
  })
  it('comparación', () => {
    const c = normalizeSonarCompare({
      project_key: 'loguru', own_modules: 10, sonar_files: 9, matched: 8,
      agreement: [{ metric: 'Complejidad ciclomática', n: 8, rho: 0.91, p_value: 0.001, note: null },
                  { metric: 'Duplicación', n: 3, rho: null, p_value: null, note: 'Muestra insuficiente' }],
      sonar_totals: { smells: 12, bugs: 1, vulnerabilities: 0, debt_minutes: 340 },
    })
    expect(c.matched).toBe(8)
    expect(c.agreement[0].rho).toBe(0.91)
    expect(c.agreement[1].note).toMatch(/insuficiente/)
    expect(c.totals.debtMinutes).toBe(340)
  })
})
