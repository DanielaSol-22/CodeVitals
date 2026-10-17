import type { ReactElement } from 'react'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RepoProvider } from '../state/RepoContext'
import { ToastProvider } from '../components/Toast'
import { FIXTURE_MODULES, FIXTURE_SUMMARY } from './fixtures'

export function renderWithProviders(ui: ReactElement, route = '/', withData = true) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[route]}>
        <ToastProvider>
          <RepoProvider initialData={withData ? { summary: FIXTURE_SUMMARY, modules: FIXTURE_MODULES } : undefined}>{ui}</RepoProvider>
        </ToastProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}
