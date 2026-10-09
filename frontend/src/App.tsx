import React, { Suspense, lazy, useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, NavLink, useLocation } from "react-router-dom";
import {
  Home,
  BarChart3,
  FolderOpen,
  Zap,
  AlertTriangle,
  TrendingUp,
  FileText,
  Settings,
  Menu,
  X,
  AlertCircle,
} from "lucide-react";
import { apiClient } from "./services/api";

// Pages
import ErrorBoundary from "./components/ErrorBoundary";
import PageSkeleton from "./components/PageSkeleton";

// Cada pantalla se descarga solo al abrirla (carga diferida).
const LandingPage = lazy(() => import("./pages/LandingPage"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const PriorityList = lazy(() => import("./pages/PriorityList"));
const ModuleAnalysis = lazy(() => import("./pages/ModuleAnalysis"));
const RepositoryHistory = lazy(() => import("./pages/RepositoryHistory"));

function RoutedContent({ onAnalyzed }: { onAnalyzed: () => void }) {
  const { pathname } = useLocation();
  return (
    // key: al cambiar de ruta, el error de una pantalla no bloquea las demás
    <ErrorBoundary key={pathname}>
      <Suspense fallback={<PageSkeleton />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/dashboard" element={<Dashboard onAnalyzed={onAnalyzed} />} />
          <Route path="/repositories" element={<RepositoryHistory />} />
          <Route path="/module" element={<ModuleAnalysis />} />
          <Route path="/priority" element={<PriorityList />} />
          <Route path="/critical" element={<div className="p-6"><p className="text-[#6B5E44]">Funciones críticas — próximamente</p></div>} />
          <Route path="/reports" element={<div className="p-6"><p className="text-[#6B5E44]">Reportes — próximamente</p></div>} />
          <Route path="/settings" element={<div className="p-6"><p className="text-[#6B5E44]">Configuración — próximamente</p></div>} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  badge?: number;
}

const NavItem: React.FC<NavItemProps> = ({ to, icon, label, badge }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `flex items-center gap-3 pl-[13px] pr-3 py-[10px] text-sm font-semibold transition-colors border-l-[3px] ${
        isActive
          ? "border-[#C97F2E] bg-[#241D13] text-[#F3ECE0]"
          : "border-transparent text-[#9C8F78] hover:text-[#E3D9C5] hover:bg-[#221B12]"
      }`
    }
  >
    <span className="text-lg">{icon}</span>
    <span className="flex-1">{label}</span>
    {badge ? (
      <span className="text-xs font-bold bg-[#2A2318] text-[#C9BBA0] px-1.5 py-0.5 rounded-sm font-mono">
        {badge}
      </span>
    ) : null}
  </NavLink>
);

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [apiAvailable, setApiAvailable] = useState<boolean | null>(null);
  const [repoCount, setRepoCount] = useState(0);

  const refreshStats = async () => {
    try {
      const response = await apiClient.get("/risk/stats");
      setRepoCount(response.data?.repos_analyzed ?? 0);
    } catch {
      // Si falla, dejamos el contador como estaba.
    }
  };

  useEffect(() => {
    const checkAPI = async () => {
      try {
        await apiClient.get("/health", { baseURL: "http://localhost:8000" });
        setApiAvailable(true);
      } catch {
        setApiAvailable(false);
      }
    };

    checkAPI();
    refreshStats();
    const interval = setInterval(checkAPI, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Router>
      <div className="flex h-screen bg-[#F2EEE3] text-[#211B14]">
        <a
          href="#contenido"
          className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-2 focus:left-2 focus:bg-[#1B160F] focus:text-[#F3ECE0] focus:px-3 focus:py-2 focus:rounded"
        >
          Saltar al contenido
        </a>
        {/* Sidebar */}
        <aside
          className={`${
            sidebarOpen ? "w-64" : "w-[72px]"
          } bg-[#1B160F] flex flex-col transition-[width] duration-200 overflow-hidden`}
        >
          {/* Logo */}
          <div className="h-[72px] px-5 flex items-center justify-between border-b border-[#2A2318]">
            <div className={`flex items-center gap-3 ${!sidebarOpen && "justify-center"}`}>
              <div className="w-8 h-8 rounded-[6px] bg-[#A6621F] flex items-center justify-center flex-shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M8.5 3.5L3.5 12L8.5 20.5"
                    stroke="#F3ECE0"
                    strokeWidth="2.25"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M15.5 3.5L20.5 12L15.5 20.5"
                    stroke="#F3ECE0"
                    strokeWidth="2.25"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M5.5 12H8.5L10.2 8L13.5 16L15.2 12H18.5"
                    stroke="#F3ECE0"
                    strokeWidth="2.25"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              {sidebarOpen && (
                <h1 className="font-serif font-bold text-[16px] text-[#F3ECE0] tracking-tight">CodeVitals</h1>
              )}
            </div>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1 text-[#9C8F78] hover:text-[#E3D9C5] rounded transition-colors"
            >
              {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 py-3 overflow-y-auto">
            {sidebarOpen && (
              <p className="text-xs font-semibold text-[#6E6354] px-4 py-2 mt-1">Principal</p>
            )}
            <NavItem to="/" icon={<Home size={18} />} label="Inicio" />
            <NavItem to="/dashboard" icon={<BarChart3 size={18} />} label="Dashboard" />
            <NavItem to="/repositories" icon={<FolderOpen size={18} />} label="Repositorios" badge={repoCount} />

            {sidebarOpen && (
              <p className="text-xs font-semibold text-[#6E6354] px-4 py-2 mt-4">Análisis</p>
            )}
            <NavItem to="/module" icon={<Zap size={18} />} label="Análisis detallado" />
            <NavItem to="/critical" icon={<AlertTriangle size={18} />} label="Funciones críticas" />
            <NavItem to="/priority" icon={<TrendingUp size={18} />} label="Tendencias" />

            {sidebarOpen && (
              <p className="text-xs font-semibold text-[#6E6354] px-4 py-2 mt-4">Utilidades</p>
            )}
            <NavItem to="/reports" icon={<FileText size={18} />} label="Reportes" />
            <NavItem to="/settings" icon={<Settings size={18} />} label="Configuración" />
          </nav>

          {/* API Status */}
          <div className="px-4 py-3.5 border-t border-[#2A2318]">
            <div className="flex items-center gap-2">
              {apiAvailable === null ? (
                <span className="w-[7px] h-[7px] rounded-full bg-[#9C8F78]" />
              ) : apiAvailable ? (
                <span className="w-[7px] h-[7px] rounded-full bg-[#C97F2E]" />
              ) : (
                <AlertCircle size={14} className="text-[#C2533F]" />
              )}
              <span className="text-xs font-semibold text-[#D3C7A8]">
                {apiAvailable === null ? "Verificando" : apiAvailable ? "API operativa" : "API sin conexión"}
              </span>
            </div>
            {sidebarOpen && apiAvailable && (
              <div className="font-mono text-[10.5px] text-[#6E6354] leading-relaxed mt-1.5 pl-[15px]">
                FastAPI + Uvicorn
                <br />
                PostgreSQL 16 en Docker
              </div>
            )}
          </div>
        </aside>

        {/* Main Content */}
        <main id="contenido" tabIndex={-1} className="flex-1 flex flex-col overflow-y-auto focus:outline-none">
          <RoutedContent onAnalyzed={refreshStats} />
        </main>
      </div>
    </Router>
  );
}
