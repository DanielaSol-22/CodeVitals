import { useNavigate } from "react-router-dom";
import { Play, FileText } from "lucide-react";

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-8">
      <div className="max-w-4xl w-full">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-6xl md:text-7xl font-bold bg-gradient-to-r from-cyan-400 to-cyan-500 bg-clip-text text-transparent mb-4">
            CodeVitals
          </h1>
          <p className="text-xl md:text-2xl text-slate-300">
            Diagnostica la salud de tu código en tiempo real
          </p>
        </div>

        {/* Chart Section */}
        <div className="bg-slate-800/50 backdrop-blur border border-cyan-500/20 rounded-lg p-12 mb-12">
          <div className="flex items-end justify-between h-64 gap-3">
            {[
              { month: "Ene", value: 45 },
              { month: "Feb", value: 52 },
              { month: "Mar", value: 38 },
              { month: "Abr", value: 65 },
              { month: "May", value: 71 },
              { month: "Jun", value: 58 },
              { month: "Jul", value: 42 },
              { month: "Ago", value: 80 },
              { month: "Sep", value: 75 },
              { month: "Oct", value: 69 },
              { month: "Nov", value: 82 },
              { month: "Dic", value: 88 },
            ].map((item, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                <div
                  className="w-full bg-gradient-to-t from-cyan-600 to-cyan-400 rounded-t hover:from-cyan-500 hover:to-cyan-300 transition cursor-pointer group relative"
                  style={{ height: `${(item.value / 100) * 100}%` }}
                >
                  <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition bg-slate-900 text-cyan-400 text-xs px-2 py-1 rounded whitespace-nowrap">
                    {item.value}%
                  </div>
                </div>
                <span className="text-xs text-slate-400 text-center">{item.month}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-6 justify-center">
          <button
            onClick={() => navigate("/dashboard")}
            className="bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white font-semibold px-8 py-4 rounded-lg transition flex items-center justify-center gap-3 group shadow-lg hover:shadow-xl"
          >
            <Play size={20} className="group-hover:scale-110 transition" />
            Iniciar análisis
          </button>
          <button
            onClick={() => navigate("/dashboard")}
            className="border-2 border-cyan-500 text-cyan-400 hover:bg-cyan-500/10 font-semibold px-8 py-4 rounded-lg transition flex items-center justify-center gap-3 group"
          >
            <FileText size={20} />
            Ver documentación
          </button>
        </div>
      </div>
    </div>
  );
}