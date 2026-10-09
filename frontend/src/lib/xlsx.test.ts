import { describe, expect, it } from 'vitest'
import { buildXlsx } from './xlsx'

describe('buildXlsx', () => {
  it('genera un ZIP válido (firma PK) con las 5 partes del libro', () => {
    const bytes = buildXlsx('Riesgo', [['Módulo', 'Puntaje'], ['src/a.py', 82]])
    expect(Array.from(bytes.slice(0, 4))).toEqual([0x50, 0x4b, 0x03, 0x04])
    const text = new TextDecoder().decode(bytes)
    for (const n of ['[Content_Types].xml', '_rels/.rels', 'xl/workbook.xml', 'xl/_rels/workbook.xml.rels', 'xl/worksheets/sheet1.xml']) {
      expect(text).toContain(n)
    }
    expect(text).toContain('<v>82</v>')
  })

  it('escapa caracteres especiales en el texto', () => {
    const text = new TextDecoder().decode(buildXlsx('Hoja', [['a<b&"c']]))
    expect(text).toContain('a&lt;b&amp;&quot;c')
  })
})
