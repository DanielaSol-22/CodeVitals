export interface Descriptive { label: string; n: number; mean: number; median: number; std: number; min: number; max: number }
export interface SpearmanRow { variable: string; label: string; inFormula: boolean; n: number; rho: number | null; pValue: number | null; significant: boolean; interpretation: string }
export interface ChiRow { variable: string; label: string; inFormula: boolean; n: number; chi2: number | null; pValue: number | null; dof: number | null; cramersV: number | null; significant: boolean; lowExpected: boolean; interpretation: string }
export interface RepoCount { repoUrl: string; modules: number; totalCommits: number }
export interface Failed { repoUrl: string; error: string }

export interface ValidationResult {
  nModules: number
  alpha: number
  sufficient: boolean
  descriptives: Descriptive[]
  spearman: SpearmanRow[]
  chiSquare: ChiRow[]
  repositories: RepoCount[]
  failed: Failed[]
  note: string
  saved: boolean
}

/* eslint-disable @typescript-eslint/no-explicit-any */
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null)
const str = (v: unknown, d = ''): string => (typeof v === 'string' ? v : d)
const arr = (v: unknown): any[] => (Array.isArray(v) ? v : [])

export function normalizeValidation(raw: any): ValidationResult {
  const r = raw ?? {}
  const desc = r.descriptives && typeof r.descriptives === 'object' ? r.descriptives : {}
  return {
    nModules: num(r.n_modules) ?? 0,
    alpha: num(r.alpha) ?? 0.05,
    sufficient: r.sufficient_sample !== false,
    descriptives: Object.entries(desc).map(([k, d]: [string, any]) => ({
      label: str(d?.label, k), n: num(d?.n) ?? 0, mean: num(d?.mean) ?? 0, median: num(d?.median) ?? 0,
      std: num(d?.std) ?? 0, min: num(d?.min) ?? 0, max: num(d?.max) ?? 0,
    })),
    spearman: arr(r.spearman).map((s) => ({
      variable: str(s.variable), label: str(s.label, str(s.variable)), inFormula: s.in_formula !== false, n: num(s.n) ?? 0, rho: num(s.rho),
      pValue: num(s.p_value), significant: s.significant === true, interpretation: str(s.interpretation),
    })),
    chiSquare: arr(r.chi_square).map((s) => ({
      variable: str(s.variable), label: str(s.label, str(s.variable)), inFormula: s.in_formula !== false, n: num(s.n) ?? 0, chi2: num(s.chi2),
      pValue: num(s.p_value), dof: num(s.dof), cramersV: num(s.cramers_v), significant: s.significant === true,
      lowExpected: s.low_expected_warning === true, interpretation: str(s.interpretation),
    })),
    repositories: arr(r.repositories).map((x) => ({ repoUrl: str(x.repo_url), modules: num(x.modules) ?? 0, totalCommits: num(x.total_commits) ?? 0 })),
    failed: arr(r.failed).map((x) => ({ repoUrl: str(x.repo_url), error: str(x.error) })),
    note: str(r.note),
    saved: r.saved === true,
  }
}

export function formatP(p: number | null): string {
  if (p === null) return '—'
  if (p < 0.001) return '< 0.001'
  return p.toFixed(3)
}

export function formatNum(v: number | null, digits = 3): string {
  return v === null ? '—' : v.toFixed(digits)
}

/** Fuerza de la correlación según |rho| (convención de Cohen / Evans). */
export function strengthLabel(rho: number | null): string {
  if (rho === null) return 'Sin dato'
  const a = Math.abs(rho)
  const dir = rho > 0 ? 'positiva' : rho < 0 ? 'negativa' : ''
  const s = a < 0.1 ? 'Nula' : a < 0.3 ? 'Débil' : a < 0.5 ? 'Moderada' : a < 0.7 ? 'Fuerte' : 'Muy fuerte'
  return s === 'Nula' ? s : `${s} ${dir}`
}

/** Referencia válida a un repositorio: URL web o carpeta ya clonada (local:nombre). */
export const isRepoRef = (v: string): boolean => v.startsWith('http') || v.startsWith('local:')

export function parseRepoUrls(text: string): string[] {
  const seen = new Set<string>()
  for (const line of text.split(/[\r\n,;]+/)) {
    const u = line.trim()
    if (u) seen.add(u)
  }
  return [...seen]
}

export const MAX_REPOS = 20

export function validationCsv(v: ValidationResult): string {
  const esc = (x: string | number | null) => `"${String(x ?? '').replace(/"/g, '""')}"`
  const rows: (string | number | null)[][] = [
    ['Prueba', 'Variable', 'Estadístico', 'gl', 'Cramér V', 'Valor p', 'n', 'Significativo', 'Interpretación'],
    ...v.spearman.map((s) => ['Spearman', s.label, s.rho, '', '', s.pValue, s.n, s.significant ? 'Sí' : 'No', s.interpretation]),
    ...v.chiSquare.map((c) => ['Chi-cuadrado', c.label, c.chi2, c.dof, c.cramersV, c.pValue, c.n, c.significant ? 'Sí' : 'No', c.interpretation]),
  ]
  return rows.map((r) => r.map(esc).join(',')).join('\r\n')
}
