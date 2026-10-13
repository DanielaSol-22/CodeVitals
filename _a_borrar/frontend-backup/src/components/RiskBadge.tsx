interface RiskBadgeProps {
  score: number;
  size?: "sm" | "md" | "lg";
}

const LEVELS = [
  { max: 33, label: "Bajo", border: "border-risk-low", text: "text-risk-low", dot: "bg-risk-low" },
  { max: 66, label: "Medio", border: "border-risk-mid", text: "text-risk-mid", dot: "bg-risk-mid" },
  { max: Infinity, label: "Alto", border: "border-risk-high", text: "text-risk-high", dot: "bg-risk-high" },
];

function levelFor(score: number) {
  return LEVELS.find((l) => score <= l.max) || LEVELS[LEVELS.length - 1];
}

const SIZES = {
  sm: { score: "text-sm", label: "text-xs", dot: "w-2 h-2" },
  md: { score: "text-base", label: "text-xs", dot: "w-2.5 h-2.5" },
  lg: { score: "text-2xl", label: "text-xs", dot: "w-3 h-3" },
};

export default function RiskBadge({ score, size = "md" }: RiskBadgeProps) {
  const level = levelFor(score);
  const s = SIZES[size];

  return (
    <div
      className="inline-flex items-center gap-2"
      role="img"
      aria-label={`Nivel de riesgo: ${level.label} (${score})`}
    >
      <span className={`${s.dot} ${level.dot} inline-block flex-shrink-0`} />
      <span className={`font-mono font-bold ${s.score} text-ink`}>{score}</span>
      <span className={`font-semibold ${s.label} ${level.text}`}>{level.label}</span>
    </div>
  );
}
