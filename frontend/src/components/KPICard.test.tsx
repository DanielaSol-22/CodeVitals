import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { KpiCard } from './KPICard'

describe('KpiCard', () => {
  it('pinta en rojo un aumento cuando el aumento no es favorable', () => {
    render(<KpiCard label="Alto riesgo" value="4" icon="warn" tint="#fff" color="#000" trend={5} trendGood={false} />)
    expect(screen.getByText(/5%/)).toHaveClass('text-risk-high')
  })

  it('pinta en verde una bajada cuando el aumento no es favorable', () => {
    render(<KpiCard label="Alto riesgo" value="4" icon="warn" tint="#fff" color="#000" trend={-1} trendGood={false} />)
    expect(screen.getByText(/1%/)).toHaveClass('text-risk-low')
  })
})
