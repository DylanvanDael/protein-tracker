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
    <div className="bg-white rounded-3xl shadow-sm border border-[#E5E5EA] overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[#F2F2F7]">
        <button onClick={onBack} className="text-[#007AFF] flex items-center gap-0.5 -ml-1">
          <ChevronLeft size={20} strokeWidth={2} />
          <span className="text-[15px]">Back</span>
        </button>
        <div className="flex-1" />
        <button onClick={onCancel} className="text-[#8E8E93]"><X size={18} /></button>
      </div>

      <div className="px-4 py-4 space-y-4">
        <div>
          <p className="text-[12px] font-medium text-[#8E8E93] uppercase tracking-wide mb-1.5">Meal name</p>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            placeholder="Meal name"
            className="text-[16px] font-semibold text-[#1C1C1E] w-full bg-[#F2F2F7] rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-[#007AFF]/30"
          />
        </div>

        <div>
          <p className="text-[12px] font-medium text-[#8E8E93] uppercase tracking-wide mb-1.5">Ingredients</p>
          <ul className="divide-y divide-[#F2F2F7] border border-[#F2F2F7] rounded-2xl overflow-hidden">
            {items.map((item, i) => (
              <li key={i} className="flex items-center gap-2 px-3 py-2.5">
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-[#1C1C1E] truncate">{item.foodName}</p>
                  <p className="text-[11px] text-[#8E8E93]">
                    {item.quantity}{item.unit} · {Math.round(item.calories)} kcal
                  </p>
                </div>
                <button
                  onClick={() => onRemoveItem(i)}
                  className="p-1.5 rounded-full text-[#C7C7CC] hover:text-[#FF453A] hover:bg-[#FFF0F0] transition-colors shrink-0"
                >
                  <Trash2 size={13} />
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-[#F2F2F7] rounded-2xl px-3 py-3">
          <p className="text-[10px] font-medium text-[#8E8E93] uppercase tracking-wide mb-2 text-center">Combined totals</p>
          <div className="grid grid-cols-4 gap-2 text-center">
            <div>
              <p className="text-[15px] font-semibold text-[#1C1C1E]">{Math.round(totals.calories)}</p>
              <p className="text-[10px] text-[#8E8E93]">kcal</p>
            </div>
            <div>
              <p className="text-[15px] font-semibold text-[#34C759]">{Math.round(totals.proteinG)}g</p>
              <p className="text-[10px] text-[#8E8E93]">Protein</p>
            </div>
            <div>
              <p className="text-[15px] font-semibold text-[#FF9F0A]">{Math.round(totals.carbsG)}g</p>
              <p className="text-[10px] text-[#8E8E93]">Carbs</p>
            </div>
            <div>
              <p className="text-[15px] font-semibold text-[#FF453A]">{Math.round(totals.fatG)}g</p>
              <p className="text-[10px] text-[#8E8E93]">Fat</p>
            </div>
          </div>
        </div>

        <button
          onClick={() => onConfirm(name.trim() || 'Meal')}
          disabled={confirming || items.length === 0}
          className="w-full py-3 rounded-2xl bg-[#007AFF] text-white font-semibold text-[15px] active:opacity-80 transition-opacity disabled:opacity-40"
        >
          {confirming ? 'Adding...' : `Add Meal (${items.length} item${items.length === 1 ? '' : 's'})`}
        </button>
      </div>
    </div>
  )
}
