import { scoreColor, scoreWord } from '../lib/risk'
import { useMounted } from '../lib/useMounted'

/** Medidor de 270° con el puntaje de riesgo (0-100). El color sale de los tokens, así que sigue al tema. */
export function ScoreRing({ score, size = 148 }: { score: number; size?: number }) {
  const r = 56
  const c = 2 * Math.PI * r
  const arc = c * 0.75
  const mounted = useMounted()
  const shown = mounted ? Math.min(100, Math.max(0, score)) : 0
  return (
    <div className="relative" style={{ width: size, height: size }} role="img" aria-label={`Puntaje de riesgo ${score} de 100, ${scoreWord(score)}`}>
      <svg viewBox="0 0 132 132" width={size} height={size} aria-hidden="true">
        <circle cx="66" cy="66" r={r} fill="none" style={{ stroke: 'var(--color-line)' }} strokeWidth="10" strokeLinecap="round" strokeDasharray={`${arc} ${c}`} transform="rotate(135 66 66)" />
        <circle
          cx="66" cy="66" r={r} fill="none" style={{ stroke: scoreColor(score), transition: 'stroke-dasharray .9s cubic-bezier(.22,1,.36,1)' }} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={`${(arc * shown) / 100} ${c}`} transform="rotate(135 66 66)"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pb-2">
        <div className="font-bold leading-none tracking-tight tabular-nums" style={{ fontSize: size * 0.3 }}>{score}</div>
        <div className="mt-1 text-muted" style={{ fontSize: Math.max(12, size * 0.085) }}>de 100</div>
      </div>
    </div>
  )
}
