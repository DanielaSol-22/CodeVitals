import type { ComponentScores, ModuleRow, Recommendation, RepoSummary, RiskLevel } from './types'
import { levelFromScore } from './risk'

/* eslint-disable @typescript-eslint/no-explicit-any */
type Raw = Record<string, any>

const num = (v: unknown, d = 0): number => {
  if (typeof v === 'number' && isFinite(v)) return v
  if (typeof v === 'string' && v.trim() !== '' && !isNaN(Number(v))) return Number(v)
  return d
}
const pick = (o: Raw | undefined, ...keys: string[]): any => {
  if (!o) return undefined
  for (const k of keys) if (o[k] !== undefined && o[k] !== null) return o[k]
  return undefined
}

function toLevel(v: unknown, score: number): RiskLevel {
  const s = String(v ?? '').toUpperCase()
  if (s.startsWith('HIGH') || s === 'ALTO') return 'HIGH'
  if (s.startsWith('MED') || s === 'MEDIO') return 'MEDIUM'
  if (s.startsWith('LOW') || s === 'BAJO') return 'LOW'
  return levelFromScore(score)
}

function toScores(raw: Raw | undefined): ComponentScores {
  const c = pick(raw, 'component_scores', 'components', 'scores') ?? {}
  return {
    complexity: num(pick(c, 'complexity', 'cc', 'complexity_score')),
    churn: num(pick(c, 'churn', 'churn_score')),
    loc: num(pick(c, 'loc', 'lines', 'loc_score')),
    duplication: num(pick(c, 'duplication', 'dup', 'duplication_score')),
    busFactor: num(pick(c, 'bus_factor', 'busFactor', 'bus_factor_score')),
  }
}

const PRIORITIES = ['ALTA', 'MEDIA', 'BAJA']

export function normalizeRecommendations(raw: unknown): Recommendation[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((r): r is Raw => typeof r === 'object' && r !== null && typeof (r as Raw).action === 'string')
    .map((r) => ({
      factor: String(r.factor ?? 'general'),
      priority: (PRIORITIES.includes(String(r.priority)) ? String(r.priority) : 'MEDIA') as Recommendation['priority'],
      action: String(r.action),
      reason: String(r.reason ?? ''),
    }))
}

export function normalizeModule(raw: Raw): ModuleRow {
  const score = num(pick(raw, 'risk_score', 'score', 'risk'))
  const code = pick(raw, 'code_metrics', 'metrics') ?? {}
  const git = pick(raw, 'git_metrics', 'git') ?? {}
  const defs = pick(raw, 'deficiencies', 'deficiency_count')
  const rawActions = pick(raw, 'recommended_actions', 'recommendations', 'actions', 'recommended_action')
  const actions = typeof rawActions === 'string' ? [rawActions] : rawActions
  const commits = pick(raw, 'commits', 'history')
  return {
    path: String(pick(raw, 'file_path', 'file', 'path', 'module') ?? 'desconocido'),
    level: toLevel(pick(raw, 'risk_level', 'level', 'classification'), score),
    score,
    cc: num(pick(raw, 'complexity', 'cc', 'cyclomatic_complexity') ?? pick(code, 'complexity', 'cyclomatic_complexity', 'cc')),
    churn: num(pick(raw, 'churn', 'churn_commits') ?? pick(git, 'churn', 'code_churn')),
    loc: num(pick(raw, 'loc', 'lines') ?? pick(code, 'loc', 'lines_of_code', 'nloc')),
    busFactor: num(pick(raw, 'bus_factor', 'bus_factor_risk') ?? pick(git, 'bus_factor', 'bus_factor_risk')),
    cognitive: (() => { const v = pick(raw, 'cognitive_complexity') ?? pick(code, 'cognitive_complexity'); return typeof v === 'number' ? v : null })(),
    churnLines: num(pick(raw, 'code_churn_lines', 'churn_lines') ?? pick(git, 'churn_lines', 'code_churn')),
    deficiencies: Array.isArray(defs) ? defs.length : num(defs),
    scores: toScores(raw),
    actions: Array.isArray(actions) ? actions.map(String) : [],
    justification: typeof raw.justification === 'string' ? raw.justification : undefined,
    recommendations: normalizeRecommendations(raw.recommendations),
    commits: Array.isArray(commits)
      ? commits.slice(0, 5).map((c: Raw) => ({
          hash: String(pick(c, 'hash', 'sha') ?? '').slice(0, 7),
          message: String(pick(c, 'message', 'msg') ?? ''),
          when: String(pick(c, 'when', 'date') ?? ''),
        }))
      : [],
  }
}

export function normalizePriority(raw: Raw | Raw[]): ModuleRow[] {
  const list = Array.isArray(raw)
    ? raw
    : pick(raw, 'priority_list', 'modules', 'items', 'results', 'top_risk_modules') ?? []
  return Array.isArray(list) ? list.map(normalizeModule) : []
}

export function normalizeRepo(raw: Raw, repoPath: string): RepoSummary {
  const total = num(pick(raw, 'total_modules', 'total_files'))
  const hi = num(pick(raw, 'high_risk_percentage'))
  const me = num(pick(raw, 'medium_risk_percentage'))
  const lo = num(pick(raw, 'low_risk_percentage'))
  const highCount = num(pick(raw, 'high_risk_modules'), Math.round((total * hi) / 100))
  const counts = {
    high: highCount,
    medium: Math.round((total * me) / 100),
    low: Math.max(0, total - highCount - Math.round((total * me) / 100)),
  }
  const metrics = pick(raw, 'metrics') ?? {}
  const name = repoPath.replace(/[\\/]+$/, '').split(/[\\/]/).pop() || repoPath
  return {
    name,
    avgScore: Math.round(num(pick(raw, 'average_risk_score', 'avg_risk_score', 'risk_score'))),
    totalModules: total,
    totalDeficiencies: num(pick(raw, 'total_deficiencies'), num(pick(metrics, 'deficiency_count'))),
    highCount,
    counts,
    pct: { low: lo, medium: me, high: hi },
    componentAvg: toScores({ components: pick(raw, 'average_component_scores', 'component_scores') }),
    busFactorAvg: num(pick(raw, 'average_bus_factor_score', 'bus_factor_avg')),
    updatedAt: new Date().toLocaleDateString('es-GT'),
    commits: pick(raw, 'total_commits') !== undefined ? num(pick(raw, 'total_commits')) : null,
    trends: {},
  }
}
