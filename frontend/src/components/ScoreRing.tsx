import { scoreColor, scoreWord } from '../lib/risk'
import { useMounted } from '../lib/useMounted'

export function ScoreRing({ score, size = 132 }: { score: number; size?: number }) {
  const r = 56
  const c = 2 * Math.PI * r
  const color = scoreColor(score)
  const mounted = useMounted()
  const shown = mounted ? Math.min(100, Math.max(0, score)) : 0
  return (
    <div className="relative" style={{ width: size, height: size }} role="img" aria-label={`Puntaje de riesgo ${score} de 100, ${scoreWord(score)}`}>
      <svg viewBox="0 0 132 132" width={size} height={size}>
        <circle cx="66" cy="66" r={r} fill="none" stroke="#e3e6f0" strokeWidth="12" />
        <circle
          cx="66" cy="66" r={r} fill="none" stroke={color} strokeWidth="12" strokeLinecap="round"
          strokeDasharray={`${(c * shown) / 100} ${c}`} transform="rotate(-90 66 66)" style={{ transition: 'stroke-dasharray .9s cubic-bezier(.22,1,.36,1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-[2.1em] font-bold leading-none" style={{ fontSize: size * 0.26 }}>{score}</div>
        <div className="mt-1 text-xs" style={{ color, fontSize: size * 0.09 }}>{scoreWord(score)}</div>
      </div>
    </div>
  )
}
