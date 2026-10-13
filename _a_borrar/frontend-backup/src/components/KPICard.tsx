import { ReactNode } from "react";

interface KPICardProps {
  title: string;
  value: number | string;
  unit?: string;
  status?: "success" | "warning" | "danger" | "info";
  icon?: ReactNode;
}

export default function KPICard({
  title,
  value,
  unit = "",
  status = "info",
  icon,
}: KPICardProps) {
  const statusConfig = {
    success: {
      bg: "bg-green-900/30",
      border: "border-green-500/30",
      text: "text-green-400",
      accent: "from-green-600 to-green-500",
    },
    warning: {
      bg: "bg-amber-900/30",
      border: "border-amber-500/30",
      text: "text-amber-400",
      accent: "from-amber-600 to-amber-500",
    },
    danger: {
      bg: "bg-red-900/30",
      border: "border-red-500/30",
      text: "text-red-400",
      accent: "from-red-600 to-red-500",
    },
    info: {
      bg: "bg-cyan-900/30",
      border: "border-cyan-500/30",
      text: "text-cyan-400",
      accent: "from-cyan-600 to-cyan-500",
    },
  };

  const config = statusConfig[status];

  return (
    <div
      className={`${config.bg} backdrop-blur border ${config.border} rounded-lg p-6`}
    >
      <div className="flex items-start justify-between mb-4">
        <p className="text-slate-400 text-sm font-medium">{title}</p>
        {icon && <div className={`${config.text}`}>{icon}</div>}
      </div>
      <div>
        <p className="text-3xl font-bold text-white">
          {value}
          {unit && <span className={`text-lg ml-1 ${config.text}`}>{unit}</span>}
        </p>
      </div>
    </div>
  );
}