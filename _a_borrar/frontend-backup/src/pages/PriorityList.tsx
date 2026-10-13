import { useEffect, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { apiClient, errorMessage } from "../services/api";
import RiskBadge from "../components/RiskBadge";
import { AlertCircle, ListOrdered, Zap } from "lucide-react";

export default function PriorityList() {
  const location = useLocation();
  const [repoUrl, setRepoUrl] = useState("");

  useEffect(() => {
    const prefill = (location.state as any)?.repoUrl;
    if (prefill) setRepoUrl(prefill);
  }, [location.state]);
  // Límite y orden viven en la URL: se pueden compartir y funcionan con "Atrás".
  const [params, setParams] = useSearchParams();
  const limit = Math.min(100, Math.max(1, Number(params.get("limite")) || 10));
  const sortBy: "risk" | "deficiencies" = params.get("orden") === "deficiencias" ? "deficiencies" : "risk";
  const setLimit = (n: number) =>
    setParams((p) => { const q = new URLSearchParams(p); q.set("limite", String(n)); return q; }, { replace: true });
  const setSortBy = (v: "risk" | "deficiencies") =>
    setParams((p) => { const q = new URLSearchParams(p); q.set("orden", v === "risk" ? "riesgo" : "deficiencias"); return q; }, { replace: true });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<any>(null);
  const [selectedModule, setSelectedModule] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUrl.trim()) {
      setError("Ingresa la URL del repositorio");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await apiClient.post("/risk/priority", {
        repo_url: repoUrl,
        limit: limit,
      });
      setData(response.data);
      if (response.data.modules && response.data.modules.length > 0) {
        setSelectedModule(response.data.modules[0]);
      } else {
        setSelectedModule(null);
      }
    } catch (err: any) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const sortedModules = data?.modules
    ? [...data.modules].sort((a: any, b: any) => {
        if (sortBy === "risk") {
          return b.risk_score - a.risk_score;
        } else {
          return b.deficiency_count - a.deficiency_count;
        }
      })
    : [];

  return (
    <div style={{ background: "#F2EEE3", minHeight: "100%", color: "#211B14" }} className="p-7 md:p-9">
      <div className="max-w-7xl mx-auto flex flex-col gap-5">
        {/* Header */}
        <div className="border-b-2 border-ink pb-4">
          <div className="font-mono text-xs text-label mb-1.5">
            orion-platform / priorización
          </div>
          <h1 className="font-serif text-[28px] font-bold m-0 tracking-tight text-ink">
            Lista de prioridades
          </h1>
          <p className="text-sm mt-1.5 text-muted">
            Módulos ordenados por riesgo y número de deficiencias
          </p>
        </div>

        {/* Form */}
        <div className="bg-surface border border-line p-6">
          <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-4 md:items-end">
            <div className="flex-1">
              <label className="block font-mono text-xs text-label mb-1.5">
                Repositorio
              </label>
              <input
                type="text"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/usuario/repositorio"
                className="w-full font-mono text-sm border border-line bg-white px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1 text-ink"
              />
            </div>
            <div className="w-full md:w-28">
              <label className="block font-mono text-xs text-label mb-1.5">
                Límite
              </label>
              <input
                type="number"
                value={limit}
                onChange={(e) => setLimit(parseInt(e.target.value) || 1)}
                min="1"
                max="100"
                className="w-full font-mono border border-line bg-white px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1 text-ink"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="text-[#FBF9F4] px-6 py-2.5 font-semibold text-sm disabled:opacity-50 whitespace-nowrap flex items-center justify-center gap-2 bg-accent hover:bg-accent-dark transition-colors"
            >
              <Zap size={16} />
              {loading ? "Cargando…" : "Cargar"}
            </button>
          </form>
          {error && (
            <div className="mt-4 p-3 border text-sm flex items-center gap-2" style={{ background: "#F3DCD4", borderColor: "#D9B2A4", color: "#7A2C1C" }}>
              <AlertCircle size={16} />
              {error}
            </div>
          )}
        </div>

        {/* Results */}
        {data && sortedModules.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Módulos List */}
            <div className="lg:col-span-2 bg-surface border border-line overflow-hidden">
              {/* Sort Controls */}
              <div className="px-5 py-3 border-b border-line flex gap-2">
                <button
                  onClick={() => setSortBy("risk")}
                  aria-pressed={sortBy === "risk"}
                  className={`px-3.5 py-1.5 text-xs font-semibold transition ${
                    sortBy === "risk" ? "bg-accent text-[#FBF9F4]" : "bg-[#EDE6D4] text-muted"
                  }`}
                >
                  Por riesgo
                </button>
                <button
                  onClick={() => setSortBy("deficiencies")}
                  aria-pressed={sortBy === "deficiencies"}
                  className={`px-3.5 py-1.5 text-xs font-semibold transition ${
                    sortBy === "deficiencies" ? "bg-accent text-[#FBF9F4]" : "bg-[#EDE6D4] text-muted"
                  }`}
                >
                  Por deficiencias
                </button>
              </div>

              {/* Table */}
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    {["Posición", "Archivo", "Riesgo", "Deficiencias"].map((h) => (
                      <th
                        key={h}
                        className="text-left text-[11px] font-semibold px-4 py-2.5 border-b border-line font-mono text-label"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedModules.map((module: any, idx: number) => (
                    <tr
                      key={idx}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedModule(module)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelectedModule(module);
                        }
                      }}
                      className="cursor-pointer transition"
                      style={
                        selectedModule?.file_path === module.file_path
                          ? { background: "#F0DFC9" }
                          : undefined
                      }
                    >
                      <td className="px-4 py-3.5 border-b border-line font-mono font-semibold text-sm text-ink">
                        {idx + 1}
                      </td>
                      <td className="px-4 py-3.5 border-b border-line font-mono text-sm break-all text-muted">
                        {module.file_path}
                      </td>
                      <td className="px-4 py-3.5 border-b border-line">
                        <RiskBadge score={module.risk_score} size="sm" />
                      </td>
                      <td className="px-4 py-3.5 border-b border-line font-mono text-sm font-semibold text-ink">
                        {module.deficiency_count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Detail Panel */}
            {selectedModule && (
              <div className="bg-surface border border-line p-6 h-fit sticky top-8 flex flex-col gap-4">
                <h3 className="font-serif text-base font-bold text-ink">Detalles del módulo</h3>

                <div>
                  <p className="font-mono text-xs text-label mb-1">Archivo</p>
                  <p className="font-mono text-sm break-all text-ink">{selectedModule.file_path}</p>
                </div>

                <div>
                  <p className="font-mono text-xs text-label mb-1.5">Riesgo</p>
                  <RiskBadge score={selectedModule.risk_score} size="lg" />
                </div>

                <div>
                  <p className="font-mono text-xs text-label mb-1">Deficiencias</p>
                  <p className="font-mono text-2xl font-bold text-ink">{selectedModule.deficiency_count}</p>
                </div>

                {selectedModule.recommended_actions && selectedModule.recommended_actions.length > 0 && (
                  <div>
                    <p className="font-mono text-xs text-label mb-2">
                      Acciones recomendadas
                    </p>
                    <ul className="flex flex-col gap-1.5">
                      {selectedModule.recommended_actions.map((action: string, idx: number) => (
                        <li key={idx} className="text-sm flex gap-2 text-ink">
                          <span className="text-accent flex-shrink-0">—</span>
                          <span>{action}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {data && sortedModules.length === 0 && (
          <div className="bg-surface border border-line p-12 text-center">
            <p className="text-muted">Ningún módulo cayó en riesgo medio o alto — buen trabajo.</p>
          </div>
        )}

        {!data && !error && (
          <div className="bg-surface border border-line p-12 text-center flex flex-col items-center gap-3">
            <ListOrdered size={28} className="text-line" />
            <p className="text-muted">
              Ingresa la URL del repositorio para obtener la lista de prioridades
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
