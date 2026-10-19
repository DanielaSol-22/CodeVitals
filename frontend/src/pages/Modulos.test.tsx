import { describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Modulos from './Modulos'
import { CommandBar } from '../components/CommandBar'
import { renderWithProviders } from '../test/renderApp'

vi.mock('../lib/api', async (orig) => ({
  ...(await orig<typeof import('../lib/api')>()),
  apiClient: { getHealth: vi.fn().mockResolvedValue(true), analyzeRepositoryRisk: vi.fn(), getPriorityList: vi.fn(), analyzeModuleRisk: vi.fn() },
}))

const bodyRows = () => within(screen.getAllByRole('rowgroup')[1]).getAllByRole('row')
const view = (route = '/modulos') => renderWithProviders(<><CommandBar /><Modulos /></>, route)

describe('Módulos', () => {
  it('muestra la primera página de 10 y el total', () => {
    view()
    expect(bodyRows()).toHaveLength(10)
    expect(screen.getByText(/de 38/)).toBeInTheDocument()
  })

  it('filtra por búsqueda', async () => {
    view()
    await userEvent.type(screen.getByRole('searchbox', { name: /buscar módulo/i }), 'billing')
    const rows = await screen.findAllByRole('row')
    expect(rows.some((r) => r.textContent?.includes('billing_engine.py'))).toBe(true)
    expect(bodyRows().length).toBeLessThan(10)
  })

  it('lee el nivel de riesgo desde la URL', () => {
    view('/modulos?nivel=HIGH')
    expect(bodyRows()).toHaveLength(6)
    expect(screen.getByText(/de 6/)).toBeInTheDocument()
  })

  it('filtra con los chips de nivel y muestra los conteos', async () => {
    view()
    expect(screen.getByRole('button', { name: /todos \(38\)/i })).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(screen.getByRole('button', { name: /alto \(6\)/i }))
    expect(screen.getByText(/de 6/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /limpiar filtros/i }))
    expect(screen.getByText(/de 38/)).toBeInTheDocument()
  })

  it('abre el detalle con foco en Cerrar y lo cierra con Escape', async () => {
    view()
    await userEvent.click(screen.getAllByRole('button', { name: /billing_engine/ })[0])
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('button', { name: 'Cerrar' })).toHaveFocus()
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
