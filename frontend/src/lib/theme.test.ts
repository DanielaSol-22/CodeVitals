import { describe, expect, it } from 'vitest'
import { applyTheme, readTheme } from './theme'

describe('tema', () => {
  it('guarda y aplica el tema elegido', () => {
    applyTheme('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(readTheme()).toBe('dark')
    applyTheme('light')
    expect(readTheme()).toBe('light')
  })
})
