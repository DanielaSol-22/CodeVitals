export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH'

export interface ComponentScores {
  complexity: number
  churn: number
  loc: number
  duplication: number
  busFactor: number
}

export interface CommitRef {
  hash: string
  message: string
  when: string
}

export interface ModuleRow {
  path: string
  level: RiskLevel
  score: number
  cc: number
  churn: number
  loc: number
  busFactor: number
  deficiencies: number
  scores: ComponentScores
  actions: string[]
  commits: CommitRef[]
}

export interface HistoryPoint {
  label: string
  complexity: number
  duplication: number
  smells: number
  loc: number
  churn: number
}

export interface RepoSummary {
  name: string
  avgScore: number
  totalModules: number
  totalDeficiencies: number
  highCount: number
  counts: { low: number; medium: number; high: number }
  pct: { low: number; medium: number; high: number }
  componentAvg: ComponentScores
  busFactorAvg: number
  updatedAt: string
  commits: number | null
  trends: Partial<Record<'modules' | 'deficiencies' | 'high' | 'busFactor', number>>
}

export type MetricKey = 'complexity' | 'duplication' | 'smells' | 'loc' | 'churn'
