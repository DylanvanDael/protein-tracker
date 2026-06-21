'use client'

interface Props {
  value: number
  goal: number
  color: string
  label: string
  unit?: string
}

export default function MacroRing({ value, goal, color, label, unit = 'g' }: Props) {
  const pct = value / goal
  const over = pct > 1
  const r = 28
  const circ = 2 * Math.PI * r

  // When over: show full ring in red + a small overflow arc on top in lighter red
  const fillColor = over ? '#FF453A' : color
  const dash = Math.min(pct, 1) * circ

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-20 h-20">
        <svg viewBox="0 0 72 72" className="w-full h-full -rotate-90">
          <circle cx="36" cy="36" r={r} fill="none" stroke="#E5E5EA" strokeWidth="6" />
          <circle
            cx="36" cy="36" r={r}
            fill="none"
            stroke={fillColor}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circ}`}
            style={{ transition: 'stroke-dasharray 0.5s ease' }}
          />
          {/* Overflow pulse ring when over goal */}
          {over && (
            <circle
              cx="36" cy="36" r={r}
              fill="none"
              stroke="#FF453A"
              strokeWidth="2"
              strokeOpacity="0.3"
              strokeDasharray={`${circ} 0`}
            />
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-sm font-semibold ${over ? 'text-[#FF453A]' : 'text-[#1C1C1E]'}`}>
            {Math.round(value)}
          </span>
          <span className="text-[10px] text-[#8E8E93]">{unit}</span>
        </div>
      </div>
      <span className={`text-xs font-medium ${over ? 'text-[#FF453A]' : 'text-[#6C6C70]'}`}>{label}</span>
    </div>
  )
}
