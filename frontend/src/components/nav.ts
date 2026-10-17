import type { IconName } from './Icon'

export const NAV: { to: string; label: string; short: string; icon: IconName }[] = [
  { to: '/', label: 'Inicio', short: 'Inicio', icon: 'home' },
  { to: '/modulos', label: 'Módulos', short: 'Módulos', icon: 'modules' },
  { to: '/analisis', label: 'Análisis', short: 'Análisis', icon: 'analysis' },
  { to: '/validacion', label: 'Validación', short: 'Validar', icon: 'stats' },
  { to: '/reportes', label: 'Reportes', short: 'Reportes', icon: 'reports' },
]
