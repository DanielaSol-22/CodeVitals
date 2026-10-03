import { CheckCircle, AlertCircle, AlertTriangle } from "lucide-react";

interface RiskBadgeProps {
  score: number;
  size?: "sm" | "md" | "lg";
}

export default function RiskBadge({ score, size = "md" }: RiskBadgeProps) {
  const getRiskLevel = (score: number) => {
    if (score <= 33) return { level: "LOW", color: "text-green-400", bg: "bg-green-900/30", border: "border-green-500/30", icon: CheckCircle };
    if (score <= 66) return { level: "MEDIUM", color: "text-amber-400", bg: "bg-amber-900/30", border: "border-amber-500/30", icon: AlertCircle };
    return { level: "HIGH", color: "text-red-400", bg: "bg-red-900/30", border: "border-red-500/30", icon: AlertTriangle };
  };

  const risk = getRiskLevel(score);
  const Icon = risk.icon;

  const sizeConfig = {
    sm: "px-3 py-1 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  };

  return (
    <div className={`${risk.bg} border ${risk.border} rounded-lg ${sizeConfig[size]} inline-flex items-center gap-2`}>
      <Icon size={size === "sm" ? 14 : size === "md" ? 16 : 20} className={risk.color} />
      <div>
        <p className={`font-semibold ${risk.color}`}>{score}</p>
        <p className="text-slate-400 text-xs">{risk.level}</p>
      </div>
    </div>
  );
}