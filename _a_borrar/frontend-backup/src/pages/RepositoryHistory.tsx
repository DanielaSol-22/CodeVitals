import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../services/api";
import {
  AlertCircle,
  Clock,
  Search,
  RefreshCw,
  ArrowUpDown,
  ListOrdered,
  Zap,
} from "lucide-react";

interface RepoHistoryEntry {
  id: number;
  nombre: string;
  url_remota: string | null;
  fecha_analisis: string;
  total_modulos: number;
  average_risk_score: number;
  classification: "HIGH" | "MEDIUM" | "LOW" | string;
  high_risk_modules: number;
  medium_risk_modules: number;
}

type SortKey = "fecha" | "riesgo" | "modulos" | "alto";

const CLASSIFICATION_LABEL: Record<string, string> = {
  HIGH: "Alto",
  MEDIUM: "Medio",
  LOW: "Bajo",
};

const CLASSIFICATION_COLOR: Record<string, string> = {
  HIGH: "#A6421F",
  MEDIUM: "#8A6B1F",
  LOW: "#3E6B37",
};

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("es-GT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function RepositoryHistory() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<RepoHistoryEntry[]>([]);
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("fecha");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const fetchHistory = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await apiClient.get("/risk/repositories");
      setHistory(response.data?.history || []);
    } catch (err: any) {
      setError(
        err.response?.data?.detail || "No se pudo obtener el historial de repositorios"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const kpis = useMemo(() => {
    const totalRepos = history.length;
    const totalModulos = history.reduce((acc, h) => acc + h.total_modulos, 0);
    const totalAlto = history.reduce((acc, h) => acc + h.high_risk_modules, 0);
    const promedio =
      totalRepos === 0
        ? 0
        : Math.round(
            (history.reduce((acc, h) => acc + h.average_risk_score, 0) / totalRepos) * 10
          ) / 10;
    return { totalRepos, totalModulos, totalAlto, promedio };
  }, [history]);

  const filteredSorted = useMemo(() => {
    const filtered = history.filter((h) =>
      h.nombre.toLowerCase().includes(query.trim().toLowerCase())
    );

    const dir = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      switch (sortKey) {
        case "riesgo":
          return (a.average_risk_score - b.average_risk_score) * dir;
        case "modulos":
          return (a.total_modulos - b.total_modulos) * dir;
        case "alto":
          return (a.high_risk_modules - b.high_risk_modules) * dir;
        default:
          return (
            (new Date(a.fecha_analisis).getTime() - new Date(b.fecha_analisis).getTime()) * dir
          );
      }
    });
  }, [history, query, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const goToPriority = (entry: RepoHistoryEntry) => {
    if (!entry.url_remota) return;
    navigate("/priority", { state: { repoUrl: entry.url_remota } });
  };

  const goToReanalyze = (entry: RepoHistoryEntry) => {
    if (!entry.url_remota) return;
    navigate("/dashboard", { state: { repoUrl: entry.url_remota } });
  };

  return (
    <div style={{ background: "#F2EEE3", minHeight: "100%", color: "#211B14" }} className="p-7 md:p-9">
      <div className="max-w-7xl mx-auto flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-end justify-between flex-wrap gap-4 border-b-2 border-ink pb-4">
          <div>
            <div className="font-mono text-xs text-label mb-1.5">
              orion-platform / historial
            </div>
            <h1 className="font-serif text-[28px] font-bold tracking-tight text-ink">
              Repositorios
            </h1>
            <p className="text-sm mt-1.5 text-muted">
              Todos los análisis realizados hasta ahora
            </p>
          </div>
          <button
            onClick={fetchHistory}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 border border-line bg-surface text-sm font-semibold disabled:opacity-50 text-ink hover:bg-[#F0E9D8] transition-colors"
          >
            <RefreshCw size={14} className={loading ? "spin-safe" : ""} />
            Actualizar
          </button>
        </div>

        {/* Vitals tiles */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-surface border border-line p-4">
            <div className="font-mono text-xs text-label">repositorios analizados</div>
            <div className="font-mono text-[24px] font-bold mt-2 leading-none text-ink">{kpis.totalRepos}</div>
          </div>
          <div className="bg-surface border border-line p-4">
            <div className="font-mono text-xs text-label">módulos evaluados</div>
            <div className="font-mono text-[24px] font-bold mt-2 leading-none text-ink">{kpis.totalModulos}</div>
          </div>
          <div className="bg-surface border border-line p-4">
            <div className="font-mono text-xs text-label">riesgo promedio global</div>
            <div className="font-mono text-[24px] font-bold mt-2 leading-none text-ink">{kpis.promedio}</div>
          </div>
          <div className="bg-surface border border-line p-4">
            <div className="font-mono text-xs text-label">módulos en alto riesgo</div>
            <div className="font-mono text-[24px] font-bold mt-2 leading-none" style={{ color: kpis.totalAlto > 0 ? "#A6421F" : "#211B14" }}>{kpis.totalAlto}</div>
          </div>
        </div>

        {/* Search + sort */}
        <div className="bg-surface border border-line p-4 flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[220px] relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-label" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar repositorio por nombre"
              aria-label="Buscar repositorio por nombre"
              className="w-full pl-9 pr-3 py-2 border border-line text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1 text-ink bg-white"
            />
          </div>
          <div className="flex items-center gap-1.5 text-sm text-muted">
            <ArrowUpDown size={13} />
            Ordenar por
          </div>
          {[
            { key: "fecha" as SortKey, label: "Fecha" },
            { key: "riesgo" as SortKey, label: "Riesgo" },
            { key: "modulos" as SortKey, label: "Módulos" },
            { key: "alto" as SortKey, label: "Alto riesgo" },
          ].map((opt) => (
            <button
              key={opt.key}
              onClick={() => toggleSort(opt.key)}
              className={`px-3 py-1.5 text-xs font-semibold border transition-colors ${
                sortKey === opt.key ? "bg-accent-soft border-accent text-accent-dark" : "border-line text-muted"
              }`}
            >
              {opt.label} {sortKey === opt.key && (sortDir === "asc" ? "↑" : "↓")}
            </button>
          ))}
        </div>

        {error && (
          <div className="p-3 border text-sm flex items-center gap-2" style={{ background: "#F3DCD4", borderColor: "#D9B2A4", color: "#7A2C1C" }}>
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {loading && (
          <div className="bg-surface border border-line p-12 text-center">
            <p className="text-sm text-muted">Cargando historial…</p>
          </div>
        )}

        {!loading && !error && history.length === 0 && (
          <div className="bg-surface border border-line p-12 text-center">
            <p className="text-sm mb-4 text-muted">
              Todavía no se ha analizado ningún repositorio.
            </p>
            <button
              onClick={() => navigate("/dashboard")}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-[#FBF9F4] text-sm font-semibold bg-accent hover:bg-accent-dark transition-colors"
            >
              <Zap size={14} />
              Analizar el primero
            </button>
          </div>
        )}

        {!loading && !error && history.length > 0 && filteredSorted.length === 0 && (
          <div className="bg-surface border border-line p-12 text-center">
            <p className="text-sm text-muted">
              Ningún repositorio coincide con "{query}".
            </p>
          </div>
        )}

        {!loading && filteredSorted.length > 0 && (
          <div className="bg-surface border border-line overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    {[
                      "Repositorio",
                      "Fecha de análisis",
                      "Módulos",
                      "Riesgo promedio",
                      "Alto riesgo",
                      "Medio riesgo",
                      "Acciones",
                    ].map((h) => (
                      <th
                        key={h}
                        className="text-left text-[11px] font-semibold px-4 py-3 border-b border-line font-mono text-label"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredSorted.map((entry) => {
                    const color = CLASSIFICATION_COLOR[entry.classification] || "#6B5E44";
                    return (
                      <tr key={entry.id}>
                        <td className="px-4 py-3.5 border-b border-line">
                          <div className="font-semibold text-sm text-ink">{entry.nombre}</div>
                          {entry.url_remota && (
                            <div className="text-xs font-mono break-all text-label">
                              {entry.url_remota}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3.5 border-b border-line text-sm text-muted">
                          <span className="flex items-center gap-1.5">
                            <Clock size={13} className="text-label" />
                            {formatDate(entry.fecha_analisis)}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 border-b border-line font-mono text-sm text-ink">
                          {entry.total_modulos}
                        </td>
                        <td className="px-4 py-3.5 border-b border-line">
                          <span className="inline-flex items-center gap-2 font-mono">
                            <span className="w-2.5 h-2.5 inline-block flex-shrink-0" style={{ background: color }} />
                            <span className="font-bold text-sm text-ink">
                              {entry.average_risk_score}
                            </span>
                            <span className="text-xs font-semibold" style={{ color }}>
                              {CLASSIFICATION_LABEL[entry.classification] || entry.classification}
                            </span>
                          </span>
                        </td>
                        <td className="px-4 py-3.5 border-b border-line font-mono text-sm font-semibold" style={{ color: "#A6421F" }}>
                          {entry.high_risk_modules}
                        </td>
                        <td className="px-4 py-3.5 border-b border-line font-mono text-sm font-semibold" style={{ color: "#8A6B1F" }}>
                          {entry.medium_risk_modules}
                        </td>
                        <td className="px-4 py-3.5 border-b border-line">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => goToPriority(entry)}
                              disabled={!entry.url_remota}
                              title={
                                entry.url_remota
                                  ? "Ver módulos priorizados"
                                  : "No disponible: repositorio sin URL registrada"
                              }
                              className="flex items-center gap-1.5 px-3 py-1.5 border border-line text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed text-ink hover:bg-[#F0E9D8] transition-colors"
                            >
                              <ListOrdered size={13} />
                              Prioridad
                            </button>
                            <button
                              onClick={() => goToReanalyze(entry)}
                              disabled={!entry.url_remota}
                              title={
                                entry.url_remota
                                  ? "Volver a analizar este repositorio"
                                  : "No disponible: repositorio sin URL registrada"
                              }
                              className="flex items-center gap-1.5 px-3 py-1.5 text-[#FBF9F4] text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed bg-accent hover:bg-accent-dark transition-colors"
                            >
                              <Zap size={13} />
                              Reanalizar
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
