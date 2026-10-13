import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { apiClient, errorMessage } from "../services/api";

interface DashboardProps {
  onAnalyzed?: () => void;
}

interface TopRiskModule {
  file_path: string;
  risk_score: number;
  classification: "HIGH" | "MEDIUM" | "LOW" | string;
  deficiency_count: number;
  cyclomatic_complexity: number;
  churn_commits: number;
  bus_factor_risk: number;
}

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

const COMPONENTS: { key: string; label: string }[] = [
  { key: "cyclomatic_complexity", label: "Complejidad" },
  { key: "code_churn", label: "Code churn" },
  { key: "lines_of_code", label: "Líneas" },
  { key: "code_duplication", label: "Duplicación" },
  { key: "bus_factor", label: "Bus factor" },
];

function classificationFromScore(score: number): "HIGH" | "MEDIUM" | "LOW" {
  if (score >= 70) return "HIGH";
  if (score >= 40) return "MEDIUM";
  return "LOW";
}

function RiskTag({ classification, score }: { classification: string; score: number }) {
  const color = CLASSIFICATION_COLOR[classification] || "#6B5E44";
  return (
    <span className="inline-flex items-center gap-2 font-mono">
      <span className="w-2.5 h-2.5 inline-block flex-shrink-0" style={{ background: color }} />
      <span className="font-bold text-sm text-ink">{score}</span>
      <span className="text-xs font-semibold" style={{ color }}>{CLASSIFICATION_LABEL[classification] || classification}</span>
    </span>
  );
}

/** Arco del medidor circular de riesgo promedio. */
function RiskGauge({ score, label }: { score: number; label: string }) {
  const radius = 74;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.min(100, score) / 100);
  return (
    <svg width="176" height="176" viewBox="0 0 176 176" role="img" aria-label={`Riesgo promedio: ${score} de 100, ${label}`}>
      <circle cx="88" cy="88" r={radius} fill="none" stroke="#E4DCC4" strokeWidth="13" />
      <circle
        cx="88"
        cy="88"
        r={radius}
        fill="none"
        stroke="#A6621F"
        strokeWidth="13"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 88 88)"
      />
      <text x="88" y="84" textAnchor="middle" fill="#211B14" fontSize="40" fontWeight="700" fontFamily="'JetBrains Mono', monospace">
        {score}
      </text>
      <text x="88" y="109" textAnchor="middle" fill="#A6621F" fontSize="12" fontFamily="'Space Grotesk', sans-serif">
        {label}
      </text>
    </svg>
  );
}

export default function Dashboard({ onAnalyzed }: DashboardProps) {
  const location = useLocation();
  const [repoUrl, setRepoUrl] = useState("");

  useEffect(() => {
    const prefill = (location.state as any)?.repoUrl;
    if (prefill) setRepoUrl(prefill);
  }, [location.state]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUrl.trim()) {
      setError("Ingresa la URL del repositorio");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await apiClient.post("/risk/repository", {
        repo_url: repoUrl,
      });
      setData(response.data);
      onAnalyzed?.();
    } catch (err: any) {
      setError(errorMessage(err, "No se pudo obtener datos del repositorio"));
    } finally {
      setLoading(false);
    }
  };

  const avgClassification = data ? classificationFromScore(data.average_risk_score || 0) : "LOW";
  const topRiskModules: TopRiskModule[] = data?.top_risk_modules || [];

  const high = data?.high_risk_percentage || 0;
  const medium = data?.medium_risk_percentage || 0;
  const low = data?.low_risk_percentage || 0;

  return (
    <div style={{ background: "#F2EEE3", minHeight: "100%", color: "#211B14" }} className="p-7 md:p-9">
      <div className="max-w-7xl mx-auto flex flex-col gap-5">
        {/* Top bar */}
        <div className="flex flex-wrap justify-between items-end gap-3 border-b-2 border-ink pb-4">
          <div>
            <div className="font-mono text-xs text-label mb-1.5">orion-platform / panel de diagnóstico</div>
            <h1 className="font-serif text-[28px] font-bold m-0 tracking-tight text-ink">
              Estado del repositorio
            </h1>
          </div>
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="https://github.com/usuario/repositorio"
              className="font-mono text-sm border border-line bg-surface px-3.5 py-2.5 w-64 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1 text-ink"
            />
            <button
              type="submit"
              disabled={loading}
              className="text-[#FBF9F4] px-5 py-2.5 font-semibold text-sm disabled:opacity-50 bg-accent hover:bg-accent-dark transition-colors"
            >
              {loading ? "Analizando…" : "Analizar"}
            </button>
          </form>
        </div>

        {error && (
          <div className="p-3 border text-sm" style={{ background: "#F3DCD4", borderColor: "#D9B2A4", color: "#7A2C1C" }}>
            {error}
          </div>
        )}

        {data && (
          <>
            {/* Gauge + vitals tiles */}
            <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
              <div className="bg-surface border border-line flex flex-col items-center justify-center gap-2 p-4">
                <RiskGauge score={data.average_risk_score || 0} label={`riesgo ${CLASSIFICATION_LABEL[avgClassification].toLowerCase()}`} />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-surface border border-line p-4">
                  <div className="font-mono text-xs text-label">módulos</div>
                  <div className="font-mono text-[26px] font-bold mt-1.5 leading-none text-ink">{data.total_modules}</div>
                </div>
                <div className="bg-surface border border-line p-4">
                  <div className="font-mono text-xs text-label">deficiencias</div>
                  <div className="font-mono text-[26px] font-bold mt-1.5 leading-none text-ink">{data.total_deficiencies}</div>
                </div>
                <div className="bg-surface border border-line p-4">
                  <div className="font-mono text-xs text-label">alto riesgo</div>
                  <div className="font-mono text-[26px] font-bold mt-1.5 leading-none" style={{ color: data.high_risk_modules > 0 ? "#A6421F" : "#211B14" }}>
                    {data.high_risk_modules}
                  </div>
                </div>
                <div className="bg-surface border border-line p-4">
                  <div className="font-mono text-xs text-label">bus factor avg</div>
                  <div className="font-mono text-[26px] font-bold mt-1.5 leading-none text-ink">
                    {data.metrics?.bus_factor ?? "—"}
                  </div>
                </div>

                <div className="bg-surface border border-line p-4 col-span-2 md:col-span-4">
                  <div className="font-mono text-xs text-label mb-2.5">distribución de riesgo</div>
                  <div className="flex h-5 w-full gap-[2px] border border-ink">
                    <div style={{ width: `${low}%`, background: "#C7D6C4" }} />
                    <div style={{ width: `${medium}%`, background: "#E8D7A8" }} />
                    <div style={{ width: `${high}%`, background: "#E3BBAC" }} />
                  </div>
                  <div className="flex justify-between mt-2 font-mono text-[11px]">
                    <span style={{ color: "#3E6B37" }}>bajo {low}%</span>
                    <span style={{ color: "#8A6B1F" }}>medio {medium}%</span>
                    <span style={{ color: "#A6421F" }}>alto {high}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Component meters */}
            <div className="bg-surface border border-line p-5">
              <div className="font-mono text-xs text-label mb-4">componentes de la fórmula ponderada</div>
              <div className="grid grid-cols-5 gap-4 items-end" style={{ height: 140 }}>
                {COMPONENTS.map((c) => {
                  const value = data.metrics?.[c.key] ?? 0;
                  const isHigh = value >= 70;
                  return (
                    <div key={c.key} className="flex flex-col items-center justify-end h-full">
                      <div className="font-mono text-sm mb-1.5" style={{ color: isHigh ? "#A6421F" : "#211B14" }}>{value}</div>
                      <div
                        style={{
                          width: 32,
                          height: `${Math.max(2, Math.min(100, value))}%`,
                          border: `1.5px solid ${isHigh ? "#A6421F" : "#211B14"}`,
                          background: isHigh ? "#F0CDBF" : "#EADFC3",
                        }}
                      />
                      <div className="font-mono text-[10px] text-muted mt-2 text-center">{c.label}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Table */}
            <div className="bg-surface border border-line overflow-hidden">
              <div className="px-5 py-4 border-b border-line">
                <div className="font-serif text-base font-bold text-ink">Módulos con mayor riesgo</div>
              </div>
              {topRiskModules.length > 0 ? (
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      {["Módulo", "Riesgo", "CC", "Churn", "Bus factor", "Deficiencias"].map((h) => (
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
                    {topRiskModules.map((m, idx) => (
                      <tr key={idx}>
                        <td className="font-mono text-sm px-4 py-3.5 border-b border-line text-ink">{m.file_path}</td>
                        <td className="px-4 py-3.5 border-b border-line">
                          <RiskTag classification={m.classification} score={m.risk_score} />
                        </td>
                        <td className="font-mono text-sm px-4 py-3.5 border-b border-line text-muted">{m.cyclomatic_complexity}</td>
                        <td className="font-mono text-sm px-4 py-3.5 border-b border-line text-muted">{m.churn_commits}</td>
                        <td className="font-mono text-sm px-4 py-3.5 border-b border-line text-muted">{m.bus_factor_risk}%</td>
                        <td className="font-mono text-sm px-4 py-3.5 border-b border-line text-muted">{m.deficiency_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-6 text-sm text-muted">
                  Ningún módulo cayó en riesgo medio o alto — buen trabajo.
                </div>
              )}
            </div>
          </>
        )}

        {!data && !error && (
          <div className="bg-surface border border-line p-12 text-center">
            <p className="text-muted">Ingresa la URL del repositorio para comenzar el análisis</p>
          </div>
        )}
      </div>
    </div>
  );
}
