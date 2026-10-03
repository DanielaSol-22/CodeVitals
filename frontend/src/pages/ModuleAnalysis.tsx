import { useState } from "react";
import { apiClient } from "../services/api";
import RiskBadge from "../components/RiskBadge";
import ComponentScoresChart from "../components/ComponentScoresChart";
import KPICard from "../components/KPICard";
import { AlertCircle, Code2, GitBranch } from "lucide-react";

export default function ModuleAnalysis() {
  const [filePath, setFilePath] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!filePath.trim()) {
      setError("Por favor ingresa la ruta del archivo");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await apiClient.post("/risk/module", {
        file_path: filePath,
      });
      setData(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || "Error al analizar el módulo");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Análisis de Módulo
          </h1>
          <p className="text-cyan-400">
            Análisis detallado de un archivo individual
          </p>
        </div>

        {/* Form */}
        <div className="bg-slate-800/50 backdrop-blur border border-cyan-500/20 rounded-lg p-6 mb-8">
          <form onSubmit={handleSubmit} className="flex gap-4">
            <input
              type="text"
              value={filePath}
              onChange={(e) => setFilePath(e.target.value)}
              placeholder="Ej: /ruta/al/archivo.py"
              className="flex-1 bg-slate-700 border border-cyan-500/30 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400"
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 disabled:opacity-50 text-white font-semibold px-6 py-2 rounded-lg transition"
            >
              {loading ? "Analizando..." : "Analizar"}
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
          <>
            {/* Risk Badge Header */}
            <div className="bg-slate-800/50 backdrop-blur border border-cyan-500/20 rounded-lg p-6 mb-8">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-cyan-400 text-sm mb-2">Archivo</p>
                  <p className="text-white text-lg font-semibold break-all">
                    {data.file_path}
                  </p>
                </div>
                <RiskBadge score={data.risk_score} size="lg" />
              </div>
            </div>

            {/* Component Scores Chart */}
            <div className="bg-slate-800/50 backdrop-blur border border-cyan-500/20 rounded-lg p-6 mb-8">
              <h3 className="text-lg font-semibold text-white mb-4">
                Calificaciones de Componentes
              </h3>
              <ComponentScoresChart
                data={
                  data.component_scores || {
                    code_complexity: 0,
                    code_duplication: 0,
                    comments_ratio: 0,
                    test_coverage: 0,
                    maintainability: 0,
                  }
                }
              />
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <KPICard
                title="Líneas de Código"
                value={data.loc || 0}
                status="info"
                icon={<Code2 size={24} />}
              />
              <KPICard
                title="Complejidad"
                value={data.complexity || 0}
                status={
                  data.complexity < 10
                    ? "success"
                    : data.complexity < 20
                      ? "warning"
                      : "danger"
                }
              />
              <KPICard
                title="Funciones"
                value={data.num_functions || 0}
                status="info"
              />
              <KPICard
                title="Deficiencias"
                value={data.deficiency_count || 0}
                status={
                  data.deficiency_count === 0
                    ? "success"
                    : data.deficiency_count < 5
                      ? "warning"
                      : "danger"
                }
              />
            </div>

            {/* Git Metrics */}
            {data.git_metrics && (
              <div className="bg-slate-800/50 backdrop-blur border border-cyan-500/20 rounded-lg p-6 mb-8">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <GitBranch size={20} className="text-cyan-400" />
                  Métricas de Git
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-slate-700/50 p-4 rounded border border-cyan-500/10">
                    <p className="text-cyan-400 text-sm">Commits</p>
                    <p className="text-2xl font-bold text-white">
                      {data.git_metrics.commits || 0}
                    </p>
                  </div>
                  <div className="bg-slate-700/50 p-4 rounded border border-cyan-500/10">
                    <p className="text-cyan-400 text-sm">Churn</p>
                    <p className="text-2xl font-bold text-white">
                      {data.git_metrics.churn || 0}
                    </p>
                  </div>
                  <div className="bg-slate-700/50 p-4 rounded border border-cyan-500/10">
                    <p className="text-cyan-400 text-sm">Bus Factor</p>
                    <p className="text-2xl font-bold text-white">
                      {data.git_metrics.bus_factor || 0}
                    </p>
                  </div>
                  <div className="bg-slate-700/50 p-4 rounded border border-cyan-500/10">
                    <p className="text-cyan-400 text-sm">Edad del Archivo</p>
                    <p className="text-2xl font-bold text-white">
                      {data.git_metrics.file_age_days || 0}d
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Deficiencies */}
            {data.deficiencies && data.deficiencies.length > 0 && (
              <div className="bg-slate-800/50 backdrop-blur border border-cyan-500/20 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Deficiencias Encontradas
                </h3>
                <div className="space-y-3">
                  {data.deficiencies.map((deficiency: any, idx: number) => (
                    <div
                      key={idx}
                      className="bg-slate-700/50 p-4 rounded border-l-4 border-cyan-500"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-white font-medium">
                            {deficiency.type}
                          </p>
                          <p className="text-slate-400 text-sm mt-1">
                            {deficiency.description}
                          </p>
                        </div>
                        <span className="text-cyan-400 text-sm font-semibold whitespace-nowrap">
                          {deficiency.severity}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {!data && !error && (
          <div className="bg-slate-800/50 backdrop-blur border border-cyan-500/20 rounded-lg p-12 text-center">
            <p className="text-slate-400">
              Ingresa la ruta del archivo para obtener un análisis detallado
            </p>
          </div>
        )}
      </div>
    </div>
  );
}