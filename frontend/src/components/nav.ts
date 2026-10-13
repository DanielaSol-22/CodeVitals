import type { IconName } from './Icon'

export const NAV: { to: string; label: string; icon: IconName }[] = [
  { to: '/', label: 'Inicio', icon: 'home' },
  { to: '/modulos', label: 'Módulos', icon: 'modules' },
  { to: '/analisis', label: 'Análisis', icon: 'analysis' },
  { to: '/validacion', label: 'Validación', icon: 'stats' },
  { to: '/reportes', label: 'Reportes', icon: 'reports' },
]
