/** Tipos y utilidades de la integración con SonarQube (herramienta de apoyo; no altera el puntaje). */

export interface SonarStatus {
  configured: boolean
  reachable: boolean
  url: string | null
  status: string | null
  version?: string
  error?: string
}

export interface SonarAgreement {
  metric: string
  n: number
  rho: number | null
  pValue: number | null
  note: string | null
}

export interface SonarCompare {
  projectKey: string
  ownModules: number
  sonarFiles: number
  matched: number
  agreement: SonarAgreement[]
  totals: { smells: number; bugs: number; vulnerabilities: number; debtMinutes: number }
}

export interface SonarFile {
  path: string
  smells: number | null
  bugs: number | null
  vulnerabilities: number | null
  debtMinutes: number | null
  complexity: number | null
  cognitive: number | null
  duplication: number | null
  ncloc: number | null
}

/* eslint-disable @typescript-eslint/no-explicit-any */
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null)

export function normalizeSonarStatus(raw: any): SonarStatus {
  return {
    configured: !!raw?.configured,
    reachable: !!raw?.reachable,
    url: typeof raw?.url === 'string' ? raw.url : null,
    status: typeof raw?.status === 'string' ? raw.status : null,
    version: typeof raw?.version === 'string' ? raw.version : undefined,
    error: typeof raw?.error === 'string' ? raw.error : undefined,
  }
}

export function normalizeSonarCompare(raw: any): SonarCompare {
  const t = raw?.sonar_totals ?? {}
  return {
    projectKey: String(raw?.project_key ?? ''),
    ownModules: Number(raw?.own_modules ?? 0),
    sonarFiles: Number(raw?.sonar_files ?? 0),
    matched: Number(raw?.matched ?? 0),
    agreement: Array.isArray(raw?.agreement)
      ? raw.agreement.map((a: any): SonarAgreement => ({
          metric: String(a.metric ?? ''),
          n: Number(a.n ?? 0),
          rho: num(a.rho),
          pValue: num(a.p_value),
          note: typeof a.note === 'string' ? a.note : null,
        }))
      : [],
    totals: {
      smells: Number(t.smells ?? 0),
      bugs: Number(t.bugs ?? 0),
      vulnerabilities: Number(t.vulnerabilities ?? 0),
      debtMinutes: Number(t.debt_minutes ?? 0),
    },
  }
}

export function normalizeSonarFiles(raw: any): SonarFile[] {
  if (!Array.isArray(raw?.files)) return []
  return raw.files.map((f: any): SonarFile => {
    const m = f?.measures ?? {}
    return {
      path: String(f?.path ?? '').replace(/\\/g, '/'),
      smells: num(m.code_smells),
      bugs: num(m.bugs),
      vulnerabilities: num(m.vulnerabilities),
      debtMinutes: num(m.sqale_index),
      complexity: num(m.complexity),
      cognitive: num(m.cognitive_complexity),
      duplication: num(m.duplicated_lines_density),
      ncloc: num(m.ncloc),
    }
  })
}

/** Clave de proyecto de SonarQube por defecto: el nombre del repositorio (como en SONARQUBE.md). */
export function defaultProjectKey(repoRef: string): string {
  const clean = repoRef.trim().replace(/\/+$/, '').replace(/\.git$/, '')
  const last = clean.split(/[/:]/).filter(Boolean).pop() ?? ''
  return last.replace(/[^A-Za-z0-9_.:-]/g, '-').slice(0, 400)
}

const norm = (p: string) => p.replace(/\\/g, '/').replace(/^(\.?\/)+/, '')

/** Empareja la ruta de un módulo con un archivo de SonarQube (igualdad o coincidencia por sufijo). */
export function findSonarFile(files: SonarFile[], modulePath: string): SonarFile | undefined {
  const own = norm(modulePath)
  return files.find((f) => norm(f.path) === own) ?? files.find((f) => own.endsWith('/' + norm(f.path)))
}

/** Deuda técnica de SonarQube (en minutos) como texto: "45 min", "3 h 20 min", "2 d 1 h". */
export function formatDebt(minutes: number | null | undefined): string {
  if (minutes == null) return '—'
  const m = Math.round(minutes)
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  if (h < 8) return m % 60 ? `${h} h ${m % 60} min` : `${h} h`
  const d = Math.floor(h / 8) // Sonar cuenta un día = 8 horas
  return h % 8 ? `${d} d ${h % 8} h` : `${d} d`
}
