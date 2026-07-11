'use client'

import { useState } from 'react'
import { ChevronLeft, X, Trash2 } from 'lucide-react'
import type { ConfirmedItem } from './types'

interface Props {
  items: ConfirmedItem[]
  onRemoveItem: (index: number) => void
  onBack: () => void
  onConfirm: (name: string) => void
  onCancel: () => void
  confirming?: boolean
}

export default function ComboBuilder({ items, onRemoveItem, onBack, onConfirm, onCancel, confirming }: Props) {
  const [name, setName] = useState(items.map(i => i.foodName).join(', '))

  const totals = items.reduce((acc, i) => ({
    calories: acc.calories + i.calories,
    proteinG: acc.proteinG + i.proteinG,
    fatG: acc.fatG + i.fatG,
    carbsG: acc.carbsG + i.carbsG,
  }), { calories: 0, proteinG: 0, fatG: 0, carbsG: 0 })

  return (
    <div className="bg-[var(--card)] rounded-3xl shadow-sm border border-[var(--border)] overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--hairline)]">
        <button onClick={onBack} className="text-[var(--accent)] flex items-center gap-0.5 -ml-1">
          <ChevronLeft size={20} strokeWidth={2} />
          <span className="text-[15px]">Back</span>
        </button>
        <div className="flex-1" />
        <button onClick={onCancel} className="text-[var(--muted)]"><X size={18} /></button>
      </div>

      <div className="px-4 py-4 space-y-4">
        <div>
          <p className="text-[12px] font-medium text-[var(--muted)] uppercase tracking-wide mb-1.5">Meal name</p>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            placeholder="Meal name"
            className="text-[16px] font-semibold text-[var(--ink)] w-full bg-[var(--fill)] rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
          />
        </div>

        <div>
          <p className="text-[12px] font-medium text-[var(--muted)] uppercase tracking-wide mb-1.5">Ingredients</p>
          <ul className="divide-y divide-[var(--hairline)] border border-[var(--hairline)] rounded-2xl overflow-hidden">
            {items.map((item, i) => (
              <li key={i} className="flex items-center gap-2 px-3 py-2.5">
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-[var(--ink)] truncate">{item.foodName}</p>
                  <p className="text-[11px] text-[var(--muted)]">
                    {item.quantity}{item.unit} · {Math.round(item.calories)} kcal
                  </p>
                </div>
                <button
                  onClick={() => onRemoveItem(i)}
                  className="p-1.5 rounded-full text-[var(--faint)] hover:text-[var(--danger)] hover:bg-[var(--danger-tint)] transition-colors shrink-0"
                >
                  <Trash2 size={13} />
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-[var(--fill)] rounded-2xl px-3 py-3">
          <p className="text-[10px] font-medium text-[var(--muted)] uppercase tracking-wide mb-2 text-center">Combined totals</p>
          <div className="grid grid-cols-4 gap-2 text-center">
            <div>
              <p className="text-[15px] font-semibold text-[var(--ink)]">{Math.round(totals.calories)}</p>
              <p className="text-[10px] text-[var(--muted)]">kcal</p>
            </div>
            <div>
              <p className="text-[15px] font-semibold text-[var(--green)]">{Math.round(totals.proteinG)}g</p>
              <p className="text-[10px] text-[var(--muted)]">Protein</p>
            </div>
            <div>
              <p className="text-[15px] font-semibold text-[var(--orange)]">{Math.round(totals.carbsG)}g</p>
              <p className="text-[10px] text-[var(--muted)]">Carbs</p>
            </div>
            <div>
              <p className="text-[15px] font-semibold text-[var(--danger)]">{Math.round(totals.fatG)}g</p>
              <p className="text-[10px] text-[var(--muted)]">Fat</p>
            </div>
          </div>
        </div>

        <button
          onClick={() => onConfirm(name.trim() || 'Meal')}
          disabled={confirming || items.length === 0}
          className="w-full py-3 rounded-2xl bg-[var(--accent)] text-white font-semibold text-[15px] active:opacity-80 transition-opacity disabled:opacity-40"
        >
          {confirming ? 'Adding...' : `Add Meal (${items.length} item${items.length === 1 ? '' : 's'})`}
        </button>
      </div>
    </div>
  )
}
