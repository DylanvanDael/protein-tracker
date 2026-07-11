'use client'

interface Props {
  value: number
  goal: number
  color: string
  label: string
  unit?: string
}

export default function MacroRing({ value, goal, color, label, unit = 'g' }: Props) {
  const pct = Math.min(value / goal, 1)
  const r = 28
  const circ = 2 * Math.PI * r
  const dash = pct * circ

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-20 h-20">
        <svg viewBox="0 0 72 72" className="w-full h-full -rotate-90">
          <circle cx="36" cy="36" r={r} fill="none" stroke="var(--border)" strokeWidth="6" />
          <circle
            cx="36" cy="36" r={r}
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circ}`}
            style={{ transition: 'stroke-dasharray 0.5s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-sm font-semibold text-[var(--ink)]">{Math.round(value)}</span>
          <span className="text-[10px] text-[var(--muted)]">{unit}</span>
        </div>
      </div>
      <span className="text-xs font-medium text-[var(--muted-strong)]">{label}</span>
    </div>
  )
}
