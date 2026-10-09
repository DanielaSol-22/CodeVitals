interface Slice { value: number; color: string }

export function Donut({ slices, center, sub, size = 104 }: { slices: Slice[]; center: string; sub: string; size?: number }) {
  const r = 40
  const c = 2 * Math.PI * r
  const total = slices.reduce((a, s) => a + s.value, 0) || 1
  let offset = 0
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 104 104" width={size} height={size} aria-hidden="true">
        <g fill="none" strokeWidth="16" transform="rotate(-90 52 52)">
          {slices.map((s, i) => {
            const len = (s.value / total) * c
            const el = <circle key={i} cx="52" cy="52" r={r} stroke={s.color} strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-offset} />
            offset += len
            return el
          })}
        </g>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-xl font-bold leading-none">{center}</div>
        <div className="text-[9px] text-muted">{sub}</div>
      </div>
    </div>
  )
}
