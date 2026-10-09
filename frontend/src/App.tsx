import { lazy, Suspense } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { Sidebar } from './components/Sidebar'
import { MobileTabBar, MobileTopBar } from './components/MobileChrome'
import { ErrorBoundary } from './components/ErrorBoundary'
import { PageSkeleton } from './components/PageSkeleton'
import { useRepo } from './state/RepoContext'

const Inicio = lazy(() => import('./pages/Inicio'))
const Modulos = lazy(() => import('./pages/Modulos'))
const Analisis = lazy(() => import('./pages/Analisis'))
const Reportes = lazy(() => import('./pages/Reportes'))

export default function App() {
  const { pathname } = useLocation()
  const { status } = useRepo()
  const loading = status === 'loading'
  return (
    <div className="min-h-screen">
      <a href="#contenido" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-brand focus:px-4 focus:py-2 focus:text-xs focus:font-semibold focus:text-white">Saltar al contenido</a>
      <MobileTopBar />
      <div className="flex gap-5 p-0 lg:p-2">
        <Sidebar />
        <main id="contenido" tabIndex={-1} aria-busy={loading} className="min-w-0 flex-1 px-4 pb-24 pt-5 outline-none lg:px-2 lg:pb-8 lg:pt-3">
          <div className={`mx-auto flex max-w-[1180px] flex-col gap-5 transition-opacity duration-200 ${loading ? 'opacity-60' : ''}`}>
            <ErrorBoundary key={pathname}>
              <Suspense fallback={<PageSkeleton />}>
                <Routes>
                  <Route path="/" element={<Inicio />} />
                  <Route path="/modulos" element={<Modulos />} />
                  <Route path="/analisis" element={<Analisis />} />
                  <Route path="/reportes" element={<Reportes />} />
                  <Route path="*" element={<Inicio />} />
                </Routes>
              </Suspense>
            </ErrorBoundary>
          </div>
        </main>
      </div>
      <MobileTabBar />
    </div>
  )
}
