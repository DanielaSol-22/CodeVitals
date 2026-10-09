import { describe, expect, it, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRepo } from './RepoContext'
import { apiClient } from '../lib/api'
import { renderWithProviders } from '../test/renderApp'

vi.mock('../lib/api', async (orig) => ({
  ...(await orig<typeof import('../lib/api')>()),
  apiClient: { getHealth: vi.fn().mockResolvedValue(true), analyzeRepositoryRisk: vi.fn(), getPriorityList: vi.fn(), analyzeModuleRisk: vi.fn() },
}))

function Probe() {
  const { summary, modules, isDemo, status, error, analyze } = useRepo()
  return (
    <div>
      <p data-testid="estado">{`${status}|${isDemo ? 'demo' : 'real'}|${summary.name}|${modules.length}`}</p>
      <p data-testid="error">{error ?? ''}</p>
      <button onClick={() => void analyze('C:\\repos\\mi-repo')}>analizar</button>
      <button onClick={() => void analyze('  ')}>vacio</button>
    </div>
  )
}

beforeEach(() => vi.clearAllMocks())

describe('RepoProvider', () => {
  it('arranca con datos de ejemplo', () => {
    renderWithProviders(<Probe />)
    expect(screen.getByTestId('estado')).toHaveTextContent('idle|demo|orion-platform|38')
  })

  it('reemplaza los datos de ejemplo por los de la API', async () => {
    vi.mocked(apiClient.analyzeRepositoryRisk).mockResolvedValue({ total_modules: 2, average_risk_score: 61 })
    vi.mocked(apiClient.getPriorityList).mockResolvedValue({ priority_list: [{ file: 'a.py', risk_score: 80 }, { file: 'b.py', risk_score: 20 }] })
    renderWithProviders(<Probe />)
    await userEvent.click(screen.getByText('analizar'))
    await waitFor(() => expect(screen.getByTestId('estado')).toHaveTextContent('ready|real|mi-repo|2'))
  })

  it('informa el error de la API y conserva los datos de ejemplo', async () => {
    vi.mocked(apiClient.analyzeRepositoryRisk).mockRejectedValue(new Error('repositorio no encontrado'))
    vi.mocked(apiClient.getPriorityList).mockRejectedValue(new Error('repositorio no encontrado'))
    renderWithProviders(<Probe />)
    await userEvent.click(screen.getByText('analizar'))
    await waitFor(() => expect(screen.getByTestId('estado')).toHaveTextContent('error|demo'))
    expect(screen.getByTestId('error')).toHaveTextContent('repositorio no encontrado')
  })

  it('pide una ruta cuando el campo está vacío', async () => {
    renderWithProviders(<Probe />)
    await userEvent.click(screen.getByText('vacio'))
    expect(screen.getByTestId('error')).toHaveTextContent('Escribe la URL')
    expect(apiClient.analyzeRepositoryRisk).not.toHaveBeenCalled()
  })
})
