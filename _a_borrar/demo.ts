import type { HistoryPoint, ModuleRow, Recommendation, RepoSummary, RiskLevel } from './types'

type Seed = [string, RiskLevel, number, number, number, number, number, number]
// ruta, nivel, puntaje, CC, churn, bus, deficiencias, líneas
const FIXED: Seed[] = [
  ['src/services/billing_engine.py', 'HIGH', 91, 88, 34, 61, 9, 4521],
  ['src/core/auth_middleware.py', 'HIGH', 84, 81, 28, 45, 7, 3982],
  ['src/api/report_generator.py', 'MEDIUM', 68, 74, 25, 39, 6, 3021],
  ['src/utils/legacy_parser.py', 'MEDIUM', 63, 69, 22, 30, 5, 2784],
  ['src/models/user.py', 'LOW', 38, 52, 18, 24, 3, 1203],
  ['src/controllers/project.py', 'LOW', 34, 48, 16, 20, 2, 980],
  ['src/services/notification.py', 'LOW', 31, 45, 14, 18, 2, 870],
  ['src/repositories/db_repository.py', 'MEDIUM', 57, 63, 20, 28, 4, 1650],
  ['src/api/auth_routes.py', 'MEDIUM', 54, 58, 17, 25, 3, 1210],
  ['src/models/task.py', 'LOW', 28, 41, 12, 16, 1, 640],
]

const EXTRA_NAMES = [
  'src/api/health.py', 'src/api/projects_routes.py', 'src/api/users_routes.py', 'src/core/config.py', 'src/core/logging.py',
  'src/core/security.py', 'src/core/cache.py', 'src/services/email_service.py', 'src/services/payment_gateway.py',
  'src/services/search_index.py', 'src/services/scheduler.py', 'src/services/audit_log.py', 'src/models/invoice.py',
  'src/models/organization.py', 'src/models/permission.py', 'src/models/session.py', 'src/controllers/billing.py',
  'src/controllers/auth.py', 'src/controllers/reports.py', 'src/repositories/user_repository.py',
  'src/repositories/task_repository.py', 'src/utils/date_utils.py', 'src/utils/validators.py', 'src/utils/formatters.py',
  'src/utils/retry.py', 'src/utils/pagination.py', 'src/workers/export_worker.py', 'src/workers/sync_worker.py',
]
const EXTRA_LEVELS: RiskLevel[] = [
  'HIGH', 'HIGH', 'HIGH', 'HIGH',
  ...Array<RiskLevel>(9).fill('MEDIUM'),
  ...Array<RiskLevel>(15).fill('LOW'),
]

function actionsFor(level: RiskLevel): string[] {
  const base = ['Reducir la complejidad ciclomática.', 'Revisar duplicación de código.', 'Mejorar la cobertura de pruebas.', 'Evaluar refactorización del módulo.']
  return level === 'LOW' ? base.slice(2, 3) : level === 'MEDIUM' ? base.slice(0, 3) : base
}

const DEMO_RECS: Record<string, { justification: string; recommendations: Recommendation[] }> = {
  'src/services/billing_engine.py': {
    justification: 'Factores de riesgo detectados: complejidad ciclomática elevada (CC 88), código inestable (34 commits), tamaño de archivo excesivo (4521 líneas), concentración de conocimiento (61% de los commits de un solo autor).',
    recommendations: [
      { factor: 'complejidad', priority: 'ALTA', action: 'Dividir las funciones más complejas: calculate_invoice (31), apply_discounts (24), reconcile_payments (19). Extraer las condiciones anidadas a funciones auxiliares, reemplazar cadenas de if/elif por un diccionario de despacho y llevar cada función a una complejidad de 10 o menos.', reason: '9 de 42 funciones superan CC 10; complejidad total del archivo: 88.' },
      { factor: 'tamaño', priority: 'ALTA', action: 'Dividir el archivo en unos 19 módulos, agrupando las funciones por responsabilidad (hoy 42 funciones en 4521 líneas), con el objetivo de que ninguno pase de 250 líneas.', reason: 'El archivo tiene 4521 líneas (se considera grande por encima de 250).' },
      { factor: 'inestabilidad', priority: 'MEDIA', action: 'Escribir pruebas de regresión antes de volver a modificarlo y revisar sus últimos cambios para encontrar qué los provoca. Si los cambios son correcciones, buscar la causa raíz.', reason: '34 commits modificaron este archivo.' },
      { factor: 'conocimiento', priority: 'MEDIA', action: 'Reducir la dependencia de una sola persona: pedir que otro integrante haga la revisión de código y el próximo cambio de este archivo, y documentar sus decisiones clave.', reason: '61% de los commits del archivo son de un solo autor (sobre 34 commits).' },
    ],
  },
}

function build(s: Seed): ModuleRow {
  const [path, level, score, cc, churn, bus, def, loc] = s
  const k = score / 100
  return {
    path, level, score, cc, churn, loc, busFactor: bus, deficiencies: def,
    cognitive: Math.round(cc * 0.8), churnLines: churn * 45,
    scores: {
      complexity: Math.min(100, Math.round(cc * 0.9)),
      churn: Math.min(100, Math.round(churn * 2)),
      loc: Math.min(100, Math.round(loc / 50)),
      duplication: Math.round(20 + k * 30),
      busFactor: bus,
    },
    actions: actionsFor(level),
    ...(DEMO_RECS[path] ?? {}),
    commits: [
      { hash: 'a3f2e4d', message: 'Fix: update billing logic', when: 'hace 2 días' },
      { hash: '7c9b8e1', message: 'Refactor: improve validation', when: 'hace 5 días' },
    ],
  }
}

function extra(): ModuleRow[] {
  return EXTRA_NAMES.map((path, i) => {
    const level = EXTRA_LEVELS[i]
    const score = level === 'HIGH' ? 72 - i * 2 : level === 'MEDIUM' ? 66 - (i - 4) * 2 : 36 - (i - 13)
    const cc = 40 + ((i * 7) % 30)
    return build([path, level, Math.max(8, score), cc, 6 + ((i * 3) % 14), 10 + ((i * 5) % 30), (i % 4) + 1, 300 + ((i * 137) % 1500)])
  })
}

export const DEMO_MODULES: ModuleRow[] = [...FIXED.map(build), ...extra()]

export const DEMO_SUMMARY: RepoSummary = {
  name: 'orion-platform',
  avgScore: 54,
  totalModules: 38,
  totalDeficiencies: 112,
  highCount: 6,
  counts: { low: 19, medium: 13, high: 6 },
  pct: { low: 50, medium: 34, high: 16 },
  componentAvg: { complexity: 62, churn: 48, loc: 55, duplication: 30, busFactor: 71 },
  busFactorAvg: 63,
  updatedAt: '03/10/2026',
  commits: 1204,
  trends: { modules: 2, deficiencies: 5, high: -1, busFactor: 4 },
}

export const DEMO_HISTORY: HistoryPoint[] = [
  { label: '15 Jul', complexity: 54, duplication: 34, smells: 40, loc: 48, churn: 30 },
  { label: '1 Ago', complexity: 55, duplication: 33, smells: 42, loc: 49, churn: 32 },
  { label: '15 Ago', complexity: 68, duplication: 31, smells: 46, loc: 52, churn: 38 },
  { label: '1 Sep', complexity: 56, duplication: 32, smells: 45, loc: 53, churn: 35 },
  { label: '15 Sep', complexity: 60, duplication: 30, smells: 47, loc: 54, churn: 40 },
  { label: '1 Oct', complexity: 70, duplication: 30, smells: 48, loc: 55, churn: 44 },
  { label: 'Hoy', complexity: 72, duplication: 30, smells: 48, loc: 55, churn: 46 },
]
