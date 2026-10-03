import { useState } from "react";
import { apiClient } from "../services/api";
import RiskBadge from "../components/RiskBadge";
import { AlertCircle, ChevronDown, ChevronUp } from "lucide-react";

export default function PriorityList() {
  const [repoPath, setRepoPath] = useState("");
  const [limit, setLimit] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<any>(null);
  const [sortBy, setSortBy] = useState<"risk" | "deficiencies">("risk");
  const [selectedModule, setSelectedModule] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoPath.trim()) {
      setError("Por favor ingresa la ruta del repositorio");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await apiClient.post("/risk/priority", {
        repo_path: repoPath,
        limit: limit,
      });
      setData(response.data);
      if (response.data.modules && response.data.modules.length > 0) {
        setSelectedModule(response.data.modules[0]);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Error al obtener datos");
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Lista de Prioridades
          </h1>
          <p className="text-cyan-400">
            Módulos ordenados por riesgo y deficiencias
          </p>
        </div>

        {/* Form */}
        <div className="bg-slate-800/50 backdrop-blur border border-cyan-500/20 rounded-lg p-6 mb-8">
          <form onSubmit={handleSubmit} className="flex gap-4 flex-wrap">
            <input
              type="text"
              value={repoPath}
              onChange={(e) => setRepoPath(e.target.value)}
              placeholder="Ej: /ruta/al/repositorio"
              className="flex-1 min-w-[200px] bg-slate-700 border border-cyan-500/30 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400"
            />
            <input
              type="number"
              value={limit}
              onChange={(e) => setLimit(parseInt(e.target.value))}
              placeholder="Límite"
              min="1"
              max="100"
              className="w-20 bg-slate-700 border border-cyan-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-400"
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 disabled:opacity-50 text-white font-semibold px-6 py-2 rounded-lg transition"
            >
              {loading ? "Cargando..." : "Cargar"}
            </button>
          </form>
          {error && (
            <div className="mt-4 p-3 bg-red-900/30 border border-red-500/50 rounded text-red-200 flex items-center gap-2">
              <AlertCircle size={18} />
              {error}
            </div>
          )}
        </div>

        {/* Results */}
        {data && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Módulos List */}
            <div className="lg:col-span-2 bg-slate-800/50 backdrop-blur border border-cyan-500/20 rounded-lg overflow-hidden">
              {/* Sort Controls */}
              <div className="bg-slate-700/50 border-b border-cyan-500/20 p-4 flex gap-2">
                <button
                  onClick={() => setSortBy("risk")}
                  className={`px-4 py-2 rounded transition ${
                    sortBy === "risk"
                      ? "bg-cyan-600 text-white"
                      : "bg-slate-600 text-slate-300 hover:bg-slate-500"
                  }`}
                >
                  Por Riesgo
                </button>
                <button
                  onClick={() => setSortBy("deficiencies")}
                  className={`px-4 py-2 rounded transition ${
                    sortBy === "deficiencies"
                      ? "bg-cyan-600 text-white"
                      : "bg-slate-600 text-slate-300 hover:bg-slate-500"
                  }`}
                >
                  Por Deficiencias
                </button>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-cyan-500/20 bg-slate-700/50">
                      <th className="text-left p-4 text-cyan-400 font-semibold">
                        Rank
                      </th>
                      <th className="text-left p-4 text-cyan-400 font-semibold">
                        Archivo
                      </th>
                      <th className="text-left p-4 text-cyan-400 font-semibold">
                        Risk Score
                      </th>
                      <th className="text-left p-4 text-cyan-400 font-semibold">
                        Deficiencias
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedModules.map((module: any, idx: number) => (
                      <tr
                        key={idx}
                        onClick={() => setSelectedModule(module)}
                        className={`border-b border-cyan-500/10 cursor-pointer transition ${
                          selectedModule?.file_path === module.file_path
                            ? "bg-cyan-500/20"
                            : "hover:bg-slate-700/50"
                        }`}
                      >
                        <td className="p-4 text-white font-semibold">#{idx + 1}</td>
                        <td className="p-4 text-slate-300 truncate text-sm">
                          {module.file_path}
                        </td>
                        <td className="p-4">
                          <RiskBadge score={module.risk_score} size="sm" />
                        </td>
                        <td className="p-4 text-white">
                          {module.deficiency_count}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Detail Panel */}
            {selectedModule && (
              <div className="bg-slate-800/50 backdrop-blur border border-cyan-500/20 rounded-lg p-6 h-fit sticky top-8">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Detalles del Módulo
                </h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-cyan-400 text-sm">Archivo</p>
                    <p className="text-white break-all text-sm">
                      {selectedModule.file_path}
                    </p>
                  </div>
                  <div>
                    <p className="text-cyan-400 text-sm">Risk Score</p>
                    <RiskBadge
                      score={selectedModule.risk_score}
                      size="lg"
                    />
                  </div>
                  <div>
                    <p className="text-cyan-400 text-sm">Deficiencias</p>
                    <p className="text-2xl font-bold text-white">
                      {selectedModule.deficiency_count}
                    </p>
                  </div>
                  {selectedModule.recommended_actions &&
                    selectedModule.recommended_actions.length > 0 && (
                      <div>
                        <p className="text-cyan-400 text-sm mb-2">
                          Acciones Recomendadas
                        </p>
                        <ul className="space-y-2">
                          {selectedModule.recommended_actions.map(
                            (action: string, idx: number) => (
                              <li
                                key={idx}
                                className="text-slate-300 text-sm flex gap-2"
                              >
                                <span className="text-cyan-400 flex-shrink-0">
                                  •
                                </span>
                                <span>{action}</span>
                              </li>
                            )
                          )}
                        </ul>
                      </div>
                    )}
                </div>
              </div>
            )}
          </div>
        )}

        {!data && !error && (
          <div className="bg-slate-800/50 backdrop-blur border border-cyan-500/20 rounded-lg p-12 text-center">
            <p className="text-slate-400">
              Ingresa los datos para obtener la lista de prioridades
            </p>
          </div>
        )}
      </div>
    </div>
  );
}