import { useState } from "react";
import { apiClient } from "../services/api";
import KPICard from "../components/KPICard";
import RiskBadge from "../components/RiskBadge";
import RiskDistributionChart from "../components/RiskDistributionChart";
import { AlertCircle, TrendingUp } from "lucide-react";

export default function Dashboard() {
  const [repoPath, setRepoPath] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoPath.trim()) {
      setError("Por favor ingresa la ruta del repositorio");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await apiClient.post("/risk/repository", {
        repo_path: repoPath,
      });
      setData(response.data);
    } catch (err: any) {
      setError(
        err.response?.data?.error || "Error al obtener datos del repositorio"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Dashboard</h1>
          <p className="text-cyan-400">
            Análisis completo de la salud de tu repositorio
          </p>
        </div>

        {/* Form */}
        <div className="bg-slate-800/50 backdrop-blur border border-cyan-500/20 rounded-lg p-6 mb-8">
          <form onSubmit={handleSubmit} className="flex gap-4">
            <input
              type="text"
              value={repoPath}
              onChange={(e) => setRepoPath(e.target.value)}
              placeholder="Ej: /ruta/al/repositorio"
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
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <KPICard
                title="Risk Score Promedio"
                value={data.average_risk_score || 0}
                unit="/100"
                status={
                  data.average_risk_score < 33
                    ? "success"
                    : data.average_risk_score < 66
                      ? "warning"
                      : "danger"
                }
                icon={<TrendingUp size={24} />}
              />
              <KPICard
                title="Módulos Analizados"
                value={data.total_modules || 0}
                status="info"
              />
              <KPICard
                title="Deficiencias"
                value={data.total_deficiencies || 0}
                status={
                  data.total_deficiencies > 50
                    ? "danger"
                    : data.total_deficiencies > 20
                      ? "warning"
                      : "success"
                }
              />
              <KPICard
                title="Módulos de Alto Riesgo"
                value={data.high_risk_modules || 0}
                status="danger"
              />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <div className="lg:col-span-1 bg-slate-800/50 backdrop-blur border border-cyan-500/20 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Distribución de Riesgo
                </h3>
                <RiskDistributionChart
                  data={{
                    HIGH: data.high_risk_percentage || 0,
                    MEDIUM: data.medium_risk_percentage || 0,
                    LOW: data.low_risk_percentage || 0,
                  }}
                />
              </div>

              <div className="lg:col-span-2 bg-slate-800/50 backdrop-blur border border-cyan-500/20 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Metricas Generales
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {data.metrics && Object.entries(data.metrics).map(([key, value]) => (
                    <div
                      key={key}
                      className="bg-slate-700/50 p-4 rounded border border-cyan-500/10"
                    >
                      <p className="text-cyan-400 text-sm capitalize">
                        {key.replace(/_/g, " ")}
                      </p>
                      <p className="text-white text-2xl font-bold">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Top Risk Modules */}
            {data.top_risk_modules && data.top_risk_modules.length > 0 && (
              <div className="bg-slate-800/50 backdrop-blur border border-cyan-500/20 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Módulos de Mayor Riesgo
                </h3>
                <div className="space-y-3">
                  {data.top_risk_modules.map((module: any, idx: number) => (
                    <div
                      key={idx}
                      className="bg-slate-700/50 p-4 rounded border border-cyan-500/10 flex items-center justify-between"
                    >
                      <div>
                        <p className="text-white font-medium">{module.file_path}</p>
                        <p className="text-slate-400 text-sm">
                          Deficiencias: {module.deficiency_count}
                        </p>
                      </div>
                      <RiskBadge score={module.risk_score} size="md" />
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
              Ingresa la ruta del repositorio para comenzar el análisis
            </p>
          </div>
        )}
      </div>
    </div>
  );
}