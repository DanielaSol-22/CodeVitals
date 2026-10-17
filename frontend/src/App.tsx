import { lazy, Suspense } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { Sidebar } from './components/Sidebar'
import { MobileTabBar, MobileTopBar } from './components/MobileChrome'
import { ErrorBoundary } from './components/ErrorBoundary'
import { RequireRepo } from './components/EmptyState'
import { PageSkeleton } from './components/PageSkeleton'
import { useRepo } from './state/RepoContext'

const Inicio = lazy(() => import('./pages/Inicio'))
const Modulos = lazy(() => import('./pages/Modulos'))
const Analisis = lazy(() => import('./pages/Analisis'))
const Validacion = lazy(() => import('./pages/Validacion'))
const Reportes = lazy(() => import('./pages/Reportes'))

export default function App() {
  const { pathname } = useLocation()
  const { status } = useRepo()
  const loading = status === 'loading'
  return (
    <div className="min-h-screen">
      <a href="#contenido" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-brand focus:px-4 focus:py-2 focus:text-[13px] focus:font-semibold focus:text-on-brand">Saltar al contenido</a>
      <MobileTopBar />
      <div className="flex">
        <Sidebar />
        <main id="contenido" tabIndex={-1} aria-busy={loading} className="min-w-0 flex-1 px-4 pb-24 pt-6 outline-hidden lg:px-10 lg:pb-12 lg:pt-9">
          <div className={`mx-auto flex max-w-[1200px] flex-col gap-6 transition-opacity duration-200 ${loading ? 'opacity-60' : ''}`}>
            <ErrorBoundary key={pathname}>
              <Suspense fallback={<PageSkeleton />}>
                <Routes>
                  <Route path="/" element={<RequireRepo><Inicio /></RequireRepo>} />
                  <Route path="/modulos" element={<RequireRepo><Modulos /></RequireRepo>} />
                  <Route path="/analisis" element={<RequireRepo><Analisis /></RequireRepo>} />
                  <Route path="/validacion" element={<Validacion />} />
                  <Route path="/reportes" element={<RequireRepo><Reportes /></RequireRepo>} />
                  <Route path="*" element={<RequireRepo><Inicio /></RequireRepo>} />
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
