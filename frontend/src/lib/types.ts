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

export interface Deficiency {
  type: string
  label: string
  /** Función donde se detectó (puede faltar). */
  fn: string
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM'
  value: number | null
  detail: string
  advice: string
}

export type RecPriority = 'ALTA' | 'MEDIA' | 'BAJA'

export interface Recommendation {
  factor: string
  priority: RecPriority
  action: string
  reason: string
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
  /** Detalle de cada deficiencia (qué función y por qué); vacío si la API no lo envía. */
  deficiencyList?: Deficiency[]
  /** Complejidad cognitiva (solo Python; null en otros lenguajes). */
  cognitive?: number | null
  /** Líneas agregadas y eliminadas (code churn). `churn` es la frecuencia: número de commits. */
  churnLines?: number
  scores: ComponentScores
  actions: string[]
  justification?: string
  recommendations?: Recommendation[]
  /** Alerta temprana: puntaje + correcciones previas, relativo al repositorio (0-100). */
  early?: { index: number; alert: boolean; fixes: number; rank: number }
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
