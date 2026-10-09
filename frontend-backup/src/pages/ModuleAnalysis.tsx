import { useState } from "react";
import { apiClient } from "../services/api";
import RiskBadge from "../components/RiskBadge";
import {
  AlertCircle,
  Code2,
  GitBranch,
  Stethoscope,
  Wrench,
  Zap,
  FileSearch,
} from "lucide-react";

const SEVERITY_COLOR: Record<string, string> = {
  HIGH: "#A6421F",
  MEDIUM: "#8A6B1F",
  LOW: "#3E6B37",
};

const COMPONENTS: { key: string; label: string }[] = [
  { key: "cyclomatic_complexity", label: "Complejidad" },
  { key: "code_churn", label: "Code churn" },
  { key: "lines_of_code", label: "Líneas" },
  { key: "code_duplication", label: "Duplicación" },
  { key: "bus_factor", label: "Bus factor" },
];

export default function ModuleAnalysis() {
  const [repoUrl, setRepoUrl] = useState("");
  const [filePath, setFilePath] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUrl.trim() || !filePath.trim()) {
      setError("Ingresa la URL del repositorio y la ruta del archivo");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await apiClient.post("/risk/module", {
        repo_url: repoUrl,
        file_path: filePath,
      });
      setData(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || "No se pudo analizar el módulo");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: "#F2EEE3", minHeight: "100%", color: "#211B14" }} className="p-7 md:p-9">
      <div className="max-w-7xl mx-auto flex flex-col gap-5">
        {/* Header */}
        <div className="border-b-2 border-ink pb-4">
          <div className="font-mono text-xs text-label mb-1.5">
            orion-platform / análisis detallado
          </div>
          <h1 className="font-serif text-[28px] font-bold m-0 tracking-tight text-ink">
            Análisis de módulo
          </h1>
          <p className="text-sm mt-1.5 text-muted">
            Diagnóstico completo de un archivo individual: componentes, deficiencias y riesgo por función
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
            <div className="flex-1">
              <label className="block font-mono text-xs text-label mb-1.5">
                Archivo
              </label>
              <input
                type="text"
                value={filePath}
                onChange={(e) => setFilePath(e.target.value)}
                placeholder="src/archivo.py"
                className="w-full font-mono text-sm border border-line bg-white px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1 text-ink"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="text-[#FBF9F4] px-6 py-2.5 font-semibold text-sm disabled:opacity-50 whitespace-nowrap flex items-center justify-center gap-2 bg-accent hover:bg-accent-dark transition-colors"
            >
              <Zap size={16} />
              {loading ? "Analizando…" : "Analizar"}
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
        {data && (
          <>
            {/* Risk Header */}
            <div className="bg-surface border border-line p-6 flex items-start justify-between gap-4 flex-wrap">
              <div>
                <p className="font-mono text-xs text-label mb-1.5">Archivo</p>
                <p className="font-mono text-base font-semibold break-all text-ink">
                  {data.file_path}
                </p>
              </div>
              <RiskBadge score={data.risk_score} size="lg" />
            </div>

            {/* Historial minimo */}
            {data.meets_minimum_history === false && (
              <div className="p-4 border text-sm flex items-center gap-2" style={{ background: "#F3E7CC", borderColor: "#D9C291", color: "#6B4A0C" }}>
                <AlertCircle size={18} className="flex-shrink-0" />
                Este repositorio tiene solo {data.repository_total_commits} commits de historial
                (se recomiendan al menos {data.minimum_commits_required}); el churn y el bus factor
                pueden ser poco representativos todavía.
              </div>
            )}

            {/* Diagnostico */}
            {(data.justification || data.recommended_action) && (
              <div className="bg-surface border border-line overflow-hidden flex">
                <div style={{ width: 3, background: "#A6621F", flexShrink: 0 }} />
                <div className="p-6 flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <Stethoscope size={18} className="text-accent" />
                    <h3 className="font-serif text-base font-bold text-ink">Diagnóstico</h3>
                  </div>
                  {data.justification && (
                    <p className="text-sm leading-relaxed text-ink">{data.justification}</p>
                  )}
                  {data.recommended_action && (
                    <div className="mt-4 flex items-start gap-2.5 p-3.5 border border-line bg-[#F7F4EB]">
                      <Wrench size={15} className="text-accent mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-mono text-[11px] font-semibold mb-1 text-accent">
                          Acción recomendada
                        </p>
                        <p className="text-sm text-ink">{data.recommended_action}</p>
                      </div>
                    </div>
                  )}
                  {data.difficulty_rating && (
                    <p className="font-mono text-xs mt-3 text-label">
                      Dificultad de mantenimiento estimada: {data.difficulty_rating}
                      {typeof data.maintenance_difficulty_index === "number" &&
                        ` (índice ${data.maintenance_difficulty_index})`}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Vitals strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-surface border border-line p-4">
                <div className="flex justify-between items-start">
                  <div className="font-mono text-xs text-label">líneas de código</div>
                  <Code2 size={14} className="text-line" />
                </div>
                <div className="font-mono text-[24px] font-bold mt-2 leading-none text-ink">{data.loc || 0}</div>
              </div>
              <div className="bg-surface border border-line p-4">
                <div className="font-mono text-xs text-label">complejidad</div>
                <div
                  className="font-mono text-[24px] font-bold mt-2 leading-none"
                  style={{ color: data.complexity < 10 ? "#3E6B37" : data.complexity < 20 ? "#8A6B1F" : "#A6421F" }}
                >
                  {data.complexity || 0}
                </div>
              </div>
              <div className="bg-surface border border-line p-4">
                <div className="font-mono text-xs text-label">funciones</div>
                <div className="font-mono text-[24px] font-bold mt-2 leading-none text-ink">{data.num_functions || 0}</div>
              </div>
              <div className="bg-surface border border-line p-4">
                <div className="font-mono text-xs text-label">deficiencias</div>
                <div
                  className="font-mono text-[24px] font-bold mt-2 leading-none"
                  style={{ color: data.deficiency_count === 0 ? "#3E6B37" : data.deficiency_count < 5 ? "#8A6B1F" : "#A6421F" }}
                >
                  {data.deficiency_count || 0}
                </div>
              </div>
            </div>

            {/* Component scores + Git metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-surface border border-line p-5">
                <div className="font-mono text-xs text-label mb-4">
                  puntajes por componente
                </div>
                <div className="grid grid-cols-5 gap-3 items-end" style={{ height: 130 }}>
                  {COMPONENTS.map((c) => {
                    const value = data.component_scores?.[c.key] ?? 0;
                    const isHigh = value >= 70;
                    return (
                      <div key={c.key} className="flex flex-col items-center justify-end h-full">
                        <div className="font-mono text-xs mb-1.5" style={{ color: isHigh ? "#A6421F" : "#211B14" }}>{value}</div>
                        <div
                          style={{
                            width: 26,
                            height: `${Math.max(2, Math.min(100, value))}%`,
                            border: `1.5px solid ${isHigh ? "#A6421F" : "#211B14"}`,
                            background: isHigh ? "#F0CDBF" : "#EADFC3",
                          }}
                        />
                        <div className="font-mono text-[9px] text-muted mt-2 text-center leading-tight">{c.label}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {data.git_metrics && (
                <div className="bg-surface border border-line p-5 flex flex-col gap-4">
                  <div className="flex items-center gap-2 font-mono text-xs text-label">
                    <GitBranch size={15} className="text-accent" />
                    métricas de git
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3.5 border border-line bg-[#F7F4EB]">
                      <p className="font-mono text-xs text-label">Commits</p>
                      <p className="font-mono text-xl font-bold text-ink">{data.git_metrics.commits || 0}</p>
                    </div>
                    <div className="p-3.5 border border-line bg-[#F7F4EB]">
                      <p className="font-mono text-xs text-label">Churn</p>
                      <p className="font-mono text-xl font-bold text-ink">{data.git_metrics.churn || 0}</p>
                    </div>
                    <div className="p-3.5 border border-line bg-[#F7F4EB]">
                      <p className="font-mono text-xs text-label">Bus factor</p>
                      <p className="font-mono text-xl font-bold text-ink">{data.git_metrics.bus_factor || 0}%</p>
                    </div>
                    <div className="p-3.5 border border-line bg-[#F7F4EB]">
                      <p className="font-mono text-xs text-label">Edad del archivo</p>
                      <p className="font-mono text-xl font-bold text-ink">{data.git_metrics.file_age_days || 0}d</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Deficiencies */}
            {data.deficiencies && data.deficiencies.length > 0 && (
              <div className="bg-surface border border-line p-6">
                <h3 className="font-serif text-base font-bold mb-4 text-ink">Deficiencias encontradas</h3>
                <div className="flex flex-col gap-3">
                  {data.deficiencies.map((deficiency: any, idx: number) => {
                    const color = SEVERITY_COLOR[deficiency.severity] || "#6B5E44";
                    return (
                      <div key={idx} className="p-4 border-l-[3px] flex items-start justify-between gap-4 bg-[#F7F4EB]" style={{ borderColor: color }}>
                        <div>
                          <p className="font-semibold text-sm text-ink">
                            {deficiency.type}
                            {deficiency.function && (
                              <span className="font-normal text-label"> — función {deficiency.function}</span>
                            )}
                          </p>
                          <p className="text-sm mt-1 text-muted">{deficiency.description}</p>
                        </div>
                        <span className="text-xs font-semibold whitespace-nowrap font-mono" style={{ color }}>
                          {deficiency.severity === "HIGH" ? "▲ " : deficiency.severity === "MEDIUM" ? "● " : "▼ "}
                          {deficiency.severity}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Riesgo por funcion */}
            {data.functions_risk && data.functions_risk.length > 0 && (
              <div className="bg-surface border border-line overflow-hidden">
                <div className="px-5 py-4 border-b border-line">
                  <div className="font-serif text-base font-bold text-ink">Riesgo por función</div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        {["Función", "Riesgo", "CC", "LOC", "Acción recomendada"].map((h) => (
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
                      {data.functions_risk.map((fr: any, idx: number) => (
                        <tr key={idx}>
                          <td className="font-mono text-sm px-4 py-3.5 border-b border-line text-ink">{fr.function}</td>
                          <td className="px-4 py-3.5 border-b border-line">
                            <RiskBadge score={fr.risk_score} size="sm" />
                          </td>
                          <td className="font-mono text-sm px-4 py-3.5 border-b border-line text-muted">{fr.cyclomatic_complexity}</td>
                          <td className="font-mono text-sm px-4 py-3.5 border-b border-line text-muted">{fr.lines_of_code}</td>
                          <td className="text-sm px-4 py-3.5 border-b border-line text-ink">{fr.recommended_action}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {data.functions_risk[0]?.approximation_note && (
                  <div className="px-5 py-3 border-t border-line font-mono text-xs text-label">
                    Nota metodológica: {data.functions_risk[0].approximation_note}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {!data && !error && (
          <div className="bg-surface border border-line p-12 text-center flex flex-col items-center gap-3">
            <FileSearch size={28} className="text-line" />
            <p className="text-muted">
              Ingresa la URL del repositorio y la ruta del archivo para obtener un análisis detallado
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
