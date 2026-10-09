import { describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Modulos from './Modulos'
import { renderWithProviders } from '../test/renderApp'

vi.mock('../lib/api', async (orig) => ({
  ...(await orig<typeof import('../lib/api')>()),
  apiClient: { getHealth: vi.fn().mockResolvedValue(true), analyzeRepositoryRisk: vi.fn(), getPriorityList: vi.fn(), analyzeModuleRisk: vi.fn() },
}))

const bodyRows = () => within(screen.getAllByRole('rowgroup')[1]).getAllByRole('row')

describe('Módulos', () => {
  it('muestra la primera página de 10 y el total', () => {
    renderWithProviders(<Modulos />)
    expect(bodyRows()).toHaveLength(10)
    expect(screen.getByText(/de 38/)).toBeInTheDocument()
  })

  it('filtra por búsqueda', async () => {
    renderWithProviders(<Modulos />)
    await userEvent.type(screen.getByRole('searchbox', { name: /buscar módulo/i }), 'billing')
    const rows = await screen.findAllByRole('row')
    expect(rows.some((r) => r.textContent?.includes('billing_engine.py'))).toBe(true)
    expect(bodyRows().length).toBeLessThan(10)
  })

  it('lee el nivel de riesgo desde la URL', () => {
    renderWithProviders(<Modulos />, '/modulos?nivel=HIGH')
    expect(bodyRows()).toHaveLength(6)
    expect(screen.getByText(/de 6/)).toBeInTheDocument()
  })

  it('abre el detalle con foco en Cerrar y lo cierra con Escape', async () => {
    renderWithProviders(<Modulos />)
    await userEvent.click(screen.getAllByRole('button', { name: /billing_engine/ })[0])
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('button', { name: 'Cerrar' })).toHaveFocus()
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
