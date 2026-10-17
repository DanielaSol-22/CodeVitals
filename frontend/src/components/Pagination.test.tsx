import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { pageWindow, Pagination } from './Pagination'

describe('pageWindow', () => {
  it('lista todas las páginas cuando caben', () => {
    expect(pageWindow(1, 3)).toEqual([1, 2, 3])
  })

  it('se desplaza al ir más allá de la página 4', () => {
    expect(pageWindow(1, 10)).toEqual([1, 2, 3, 4])
    expect(pageWindow(5, 10)).toEqual([4, 5, 6, 7])
    expect(pageWindow(10, 10)).toEqual([7, 8, 9, 10])
  })
})

describe('Pagination', () => {
  it('permite ir a una página posterior a la 4', async () => {
    const onPage = vi.fn()
    const { rerender } = render(<Pagination page={4} pages={8} onPage={onPage} />)
    await userEvent.click(screen.getByRole('button', { name: 'Página siguiente' }))
    expect(onPage).toHaveBeenCalledWith(5)
    rerender(<Pagination page={5} pages={8} onPage={onPage} />)
    expect(screen.getByRole('button', { name: '5' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('button', { name: '6' })).toBeInTheDocument()
  })
})
