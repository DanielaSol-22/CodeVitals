import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Validacion from './Validacion'
import { apiClient } from '../lib/api'
import { renderWithProviders } from '../test/renderApp'

vi.mock('../lib/api', async (orig) => ({
  ...(await orig<typeof import('../lib/api')>()),
  apiClient: { getHealth: vi.fn().mockResolvedValue(true), analyzeRepositoryRisk: vi.fn(), getPriorityList: vi.fn(), analyzeModuleRisk: vi.fn(), validateRepos: vi.fn() },
}))

const RAW = {
  n_modules: 22, alpha: 0.05, sufficient_sample: true, descriptives: {},
  spearman: [{ variable: 'bus_factor', label: 'Bus factor', n: 22, rho: 0.5, p_value: 0.01, significant: true, interpretation: '' }],
  chi_square: [{ variable: 'bus_factor', label: 'Bus factor', n: 22, chi2: 9, p_value: 0.06, dof: 4, cramers_v: 0.3, significant: false, low_expected_warning: true, interpretation: '' }],
  repositories: [{ repo_url: 'https://github.com/a/b', modules: 22, total_commits: 5 }], failed: [], note: 'Nota de prueba', saved: true,
}

describe('Validación', () => {
  beforeEach(() => { sessionStorage.clear(); vi.mocked(apiClient.validateRepos).mockReset() })

  it('ejecuta la validación y muestra resultados', async () => {
    vi.mocked(apiClient.validateRepos).mockResolvedValue(RAW)
    renderWithProviders(<Validacion />)
    const run = screen.getByRole('button', { name: /ejecutar validación/i })
    expect(run).toBeDisabled()
    await userEvent.type(screen.getByLabelText(/repositorios a analizar/i), 'https://github.com/a/b')
    await userEvent.click(run)
    expect(await screen.findByText('Cada métrica contra el riesgo')).toBeInTheDocument()
    expect(apiClient.validateRepos).toHaveBeenCalledWith(['https://github.com/a/b'], 0.05)
    expect(screen.getByText('Nota de prueba')).toBeInTheDocument()
    expect(screen.getByText('Ver detalle completo')).toBeInTheDocument()
    expect(screen.getAllByText(/frecuencias bajas/).length).toBeGreaterThan(0)
  })

  it('muestra el error de la API', async () => {
    vi.mocked(apiClient.validateRepos).mockRejectedValue(new Error('repositorio no encontrado'))
    renderWithProviders(<Validacion />)
    await userEvent.type(screen.getByLabelText(/repositorios a analizar/i), 'x')
    await userEvent.click(screen.getByRole('button', { name: /ejecutar validación/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent('repositorio no encontrado')
  })
})
