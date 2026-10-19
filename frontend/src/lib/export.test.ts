import { describe, expect, it } from 'vitest'
import { buildReport, reportHtml, workbookSheets } from './export'
import { normalizeDeficiencies } from './normalize'
import { buildWorkbook } from './xlsx'
import type { ModuleRow } from './types'

const scores = { complexity: 0, churn: 0, loc: 0, duplication: 0, busFactor: 0 }
const mod = (path: string, score: number, level: ModuleRow['level'], defs: ModuleRow['deficiencyList'] = []): ModuleRow => ({
  path, level, score, cc: 12, churn: 5, loc: 300, busFactor: 60, deficiencies: defs.length, deficiencyList: defs,
  scores, actions: ['Dividir el módulo'], commits: [],
})
const DEF = { type: 'LONG_METHOD', label: 'Función muy larga', fn: 'run<x>', severity: 'MEDIUM' as const, value: 80, detail: '80 líneas; lo recomendado es menos de 50.', advice: 'Extrae bloques.' }
const MODS = [mod('src/<b>.py', 40, 'MEDIUM'), mod('src/a.py', 82, 'HIGH', [DEF]), mod('src/c.py', 10, 'LOW')]

describe('buildReport', () => {
  it('ordena por puntaje y cuenta niveles y deficiencias', () => {
    const r = buildReport(MODS, 'demo', new Date('2026-10-19T12:00:00'))
    expect(r.mods.map((m) => m.path)[0]).toBe('src/a.py')
    expect(r.counts).toEqual({ HIGH: 1, MEDIUM: 1, LOW: 1 })
    expect(r.deficiencies).toBe(1)
    expect(r.avg).toBe(44)
    expect(r.defRows).toHaveLength(1)
  })
})

describe('workbookSheets', () => {
  it('crea Resumen, Módulos y Deficiencias, y omite Deficiencias si no hay', () => {
    const names = workbookSheets(buildReport(MODS, 'demo')).map((s) => s.name)
    expect(names).toEqual(['Resumen', 'Módulos', 'Deficiencias'])
    expect(workbookSheets(buildReport([mod('a.py', 5, 'LOW')], 'demo')).map((s) => s.name)).toEqual(['Resumen', 'Módulos'])
  })
  it('genera un libro válido con estilos y filtros', () => {
    const text = new TextDecoder().decode(buildWorkbook(workbookSheets(buildReport(MODS, 'demo'))))
    for (const n of ['xl/styles.xml', 'xl/worksheets/sheet3.xml', 'autoFilter', 'dataBar', 'state="frozen"']) expect(text).toContain(n)
  })
})

describe('reportHtml', () => {
  it('escapa el texto y muestra las deficiencias del módulo de riesgo alto', () => {
    const html = reportHtml(buildReport(MODS, 'demo<script>'))
    expect(html).not.toContain('<script>')
    expect(html).toContain('src/&lt;b&gt;.py')
    expect(html).toContain('Función muy larga')
    expect(html).toContain('Cómo corregirlo: Extrae bloques.')
  })
})

describe('normalizeDeficiencies', () => {
  it('lee el detalle y tolera datos incompletos', () => {
    const r = normalizeDeficiencies([{ type: 'LONG_METHOD', label: 'Función muy larga', function: 'f', severity: 'MEDIUM', value: 80, detail: 'd', advice: 'a' }, { type: 'X', severity: 'raro' }])
    expect(r[0]).toMatchObject({ fn: 'f', severity: 'MEDIUM', value: 80 })
    expect(r[1].severity).toBe('MEDIUM')
    expect(normalizeDeficiencies(3)).toEqual([])
  })
})
