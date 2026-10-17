import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import { RepoProvider } from './state/RepoContext'
import { ToastProvider } from './components/Toast'
import './index.css'
import { applyTheme, readTheme } from './lib/theme'

applyTheme(readTheme())

const queryClient = new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false } } })

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ToastProvider>
          <RepoProvider>
            <App />
          </RepoProvider>
        </ToastProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
)
