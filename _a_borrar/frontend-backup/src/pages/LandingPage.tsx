import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Play, FileText } from "lucide-react";
import { apiClient } from "../services/api";

export default function LandingPage() {
  const navigate = useNavigate();
  const [repoCount, setRepoCount] = useState<number | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await apiClient.get("/risk/stats");
        setRepoCount(response.data?.repos_analyzed ?? 0);
      } catch {
        setRepoCount(null);
      }
    };
    fetchStats();
  }, []);

  const stats = [
    { label: "Repositorios analizados", value: repoCount === null ? "—" : String(repoCount) },
    { label: "Componentes de riesgo", value: "5" },
    { label: "Historial mínimo recomendado", value: "50 commits" },
    { label: "Proyectos de validación", value: "3" },
  ];

  return (
    <div style={{ background: "#F2EEE3", minHeight: "100%", color: "#211B14" }} className="p-7 md:p-9">
      <div className="max-w-5xl mx-auto flex flex-col gap-10 pt-6 md:pt-14">
        {/* Hero */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_260px] gap-10 items-center">
          <div>
            <div className="font-mono text-xs text-label mb-3">
              Detección temprana de riesgo en código
            </div>
            <h1 className="font-serif text-[38px] md:text-[46px] font-bold leading-[1.12] tracking-tight text-ink">
              CodeVitals lee el historial de tu repositorio y dice qué módulos van a dar problemas.
            </h1>
            <p className="text-base mt-5 max-w-xl leading-relaxed text-muted">
              Combina complejidad ciclomática, code churn, duplicación y bus factor sobre el
              historial real de Git para señalar, con una justificación concreta, los módulos y
              funciones con mayor dificultad de mantenimiento.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mt-8">
              <button
                onClick={() => navigate("/dashboard")}
                className="text-[#FBF9F4] font-semibold px-6 py-3 flex items-center justify-center gap-2.5 bg-accent hover:bg-accent-dark transition-colors"
              >
                <Play size={17} aria-hidden="true" />
                Iniciar análisis
              </button>
              <button
                onClick={() => navigate("/repositories")}
                className="font-semibold px-6 py-3 border border-line flex items-center justify-center gap-2.5 text-ink hover:bg-surface transition-colors"
              >
                <FileText size={17} aria-hidden="true" />
                Ver historial
              </button>
            </div>
          </div>

          {/* Gauge mark */}
          <svg width="220" height="180" viewBox="0 0 220 180" className="w-full max-w-[220px] mx-auto hidden md:block" role="img" aria-label="Medidor de riesgo ilustrativo">
            <circle cx="110" cy="100" r="68" fill="none" stroke="#E4DCC4" strokeWidth="12" />
            <circle
              cx="110" cy="100" r="68" fill="none" stroke="#A6621F" strokeWidth="12"
              strokeDasharray="427.3" strokeDashoffset="192.3" strokeLinecap="round"
              transform="rotate(-90 110 100)"
            />
            <text x="110" y="96" textAnchor="middle" fill="#211B14" fontSize="30" fontWeight="700" fontFamily="'JetBrains Mono', monospace">55</text>
            <text x="110" y="118" textAnchor="middle" fill="#A6621F" fontSize="11" fontFamily="'Space Grotesk', sans-serif">riesgo</text>
          </svg>
        </div>

        {/* Vitals strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {stats.map((s) => (
            <div key={s.label} className="bg-surface border border-line p-4">
              <div className="font-mono text-xl font-bold leading-none text-ink">{s.value}</div>
              <div className="font-mono text-xs mt-2 text-label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Methodology note */}
        <div className="pb-10">
          <p className="text-sm text-muted">
            Validado contra proyectos reales (Flask, Requests, FastAPI) y contrastado con una
            encuesta a desarrolladores junior para calibrar la fórmula de riesgo.
          </p>
        </div>
      </div>
    </div>
  );
}
