import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, NavLink } from "react-router-dom";
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
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { apiClient } from "./services/api";

// Pages
import LandingPage from "./pages/LandingPage";
import Dashboard from "./pages/Dashboard";
import PriorityList from "./pages/PriorityList";
import ModuleAnalysis from "./pages/ModuleAnalysis";

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
      `flex items-center gap-3 px-4 py-3 rounded-lg transition-all group ${
        isActive
          ? "bg-cyan-500/20 text-cyan-400 border-l-2 border-cyan-400"
          : "text-slate-400 hover:bg-slate-800 hover:text-cyan-400"
      }`
    }
  >
    <span className="text-lg">{icon}</span>
    <span className="flex-1">{label}</span>
    {badge && <span className="text-xs bg-red-500 text-white px-2 py-1 rounded-full">{badge}</span>}
  </NavLink>
);

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [apiAvailable, setApiAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAPI = async () => {
      try {
        const response = await apiClient.get("/health");
        setApiAvailable(true);
      } catch {
        setApiAvailable(false);
      }
    };

    checkAPI();
    const interval = setInterval(checkAPI, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Router>
      <div className="flex h-screen bg-slate-950 text-slate-100">
        {/* Sidebar */}
        <aside
          className={`${
            sidebarOpen ? "w-72" : "w-20"
          } bg-gradient-to-b from-slate-900 to-slate-950 border-r border-slate-800 flex flex-col transition-all duration-300 overflow-hidden`}
        >
          {/* Logo */}
          <div className="p-6 border-b border-slate-800 flex items-center justify-between">
            <div className={`flex items-center gap-3 ${!sidebarOpen && "justify-center"}`}>
              <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg">
                <BarChart3 size={24} className="text-white" />
              </div>
              {sidebarOpen && (
                <div>
                  <h1 className="font-bold text-lg bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                    CodeVitals
                  </h1>
                  <p className="text-xs text-slate-500">v1.0</p>
                </div>
              )}
            </div>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1 hover:bg-slate-800 rounded transition-colors"
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {/* Principal */}
            {sidebarOpen && (
              <p className="text-xs font-bold text-slate-500 px-4 py-2 uppercase tracking-wider">Principal</p>
            )}
            <NavItem to="/" icon={<Home size={20} />} label="Inicio" />
            <NavItem to="/dashboard" icon={<BarChart3 size={20} />} label="Dashboard" />
            <NavItem to="/repositories" icon={<FolderOpen size={20} />} label="Repositorios" badge={3} />

            {sidebarOpen && (
              <p className="text-xs font-bold text-slate-500 px-4 py-2 mt-4 uppercase tracking-wider">Análisis</p>
            )}
            <NavItem to="/module" icon={<Zap size={20} />} label="Análisis Detallado" />
            <NavItem to="/critical" icon={<AlertTriangle size={20} />} label="Funciones Críticas" />
            <NavItem to="/priority" icon={<TrendingUp size={20} />} label="Tendencias" />

            {sidebarOpen && (
              <p className="text-xs font-bold text-slate-500 px-4 py-2 mt-4 uppercase tracking-wider">Utilidades</p>
            )}
            <NavItem to="/reports" icon={<FileText size={20} />} label="Reportes" />
            <NavItem to="/settings" icon={<Settings size={20} />} label="Configuración" />
          </nav>

          {/* API Status */}
          <div className="p-4 border-t border-slate-800 bg-slate-950/50">
            <div className="flex items-center gap-2">
              {apiAvailable === null ? (
                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
              ) : apiAvailable ? (
                <CheckCircle size={16} className="text-green-500" />
              ) : (
                <AlertCircle size={16} className="text-red-500" />
              )}
              <span className="text-xs text-slate-400">
                {apiAvailable === null ? "Verificando..." : apiAvailable ? "API OK" : "API offline"}
              </span>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/repositories" element={<PriorityList />} />
            <Route path="/module" element={<ModuleAnalysis />} />
            <Route path="/priority" element={<PriorityList />} />
            {/* Placeholders para otras rutas */}
            <Route path="/critical" element={<div className="p-6"><p className="text-slate-400">Funciones Críticas - Próximamente</p></div>} />
            <Route path="/reports" element={<div className="p-6"><p className="text-slate-400">Reportes - Próximamente</p></div>} />
            <Route path="/settings" element={<div className="p-6"><p className="text-slate-400">Configuración - Próximamente</p></div>} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}