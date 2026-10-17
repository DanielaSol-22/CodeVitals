import { describe, expect, it } from 'vitest'
import { trendOf } from './trend'

describe('trendOf', () => {
  it('necesita al menos dos análisis', () => {
    expect(trendOf([])).toBeNull()
    expect(trendOf([40])).toBeNull()
  })
  it('detecta subida, bajada y sin cambio', () => {
    expect(trendOf([30, 35.5])).toMatchObject({ direction: 'up', delta: 5.5, previous: 30, current: 35.5 })
    expect(trendOf([50, 41])?.direction).toBe('down')
    expect(trendOf([20, 20, 20])?.direction).toBe('flat')
  })
})
