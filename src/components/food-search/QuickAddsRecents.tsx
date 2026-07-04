'use client'

import { useState } from 'react'
import { X, Trash2, PenLine, Layers } from 'lucide-react'
import SearchPanel from './SearchPanel'
import { toFoodResult, type FoodResult, type ConfirmedItem } from './types'
import type { QuickAdd } from '@/lib/schema'
import type { getRecentFoods } from '@/lib/actions'

type RecentFood = Awaited<ReturnType<typeof getRecentFoods>>[number]
type Tab = 'search' | 'quick' | 'recent'

interface Props {
  quickAdds: QuickAdd[]
  recentFoods: RecentFood[]
  combo?: ConfirmedItem[]
  onSelectFood: (food: FoodResult) => void
  onScanRequested: () => void
  onNewQuickAdd: () => void
  onDeleteQuickAdd: (id: number) => void
  onStartCombo: () => void
  onFinishCombo: () => void
  onCancelCombo: () => void
  onClose: () => void
  barcodeLoading?: boolean
  barcodeError?: string
  onDismissBarcodeError?: () => void
}

function macroPreview(f: { calories: number; proteinG: number }) {
  return `${Math.round(f.calories)} kcal · ${Math.round(f.proteinG)}g protein`
}

export default function QuickAddsRecents({
  quickAdds, recentFoods, combo,
  onSelectFood, onScanRequested, onNewQuickAdd, onDeleteQuickAdd,
  onStartCombo, onFinishCombo, onCancelCombo, onClose,
  barcodeLoading, barcodeError, onDismissBarcodeError,
}: Props) {
  const [tab, setTab] = useState<Tab>('search')

  const comboTotal = combo?.reduce((acc, i) => ({
    calories: acc.calories + i.calories,
    proteinG: acc.proteinG + i.proteinG,
  }), { calories: 0, proteinG: 0 })

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-[#E5E5EA] overflow-hidden">
      <div className="flex items-center gap-1 px-3 pt-3">
        {([
          { key: 'search' as const, label: 'Search' },
          { key: 'quick' as const, label: 'Quick Adds' },
          { key: 'recent' as const, label: 'Recents' },
        ]).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 rounded-full text-[13px] font-medium transition-colors ${
              tab === t.key ? 'bg-[#007AFF] text-white' : 'text-[#6C6C70] hover:bg-[#F2F2F7]'
            }`}
          >
            {t.label}
          </button>
        ))}
        <div className="flex-1" />
        <button onClick={onClose} className="text-[#8E8E93] p-1">
          <X size={18} />
        </button>
      </div>

      {combo ? (
        <div className="mx-3 mt-3 px-3 py-2.5 rounded-2xl bg-[#EBF4FF] flex items-center justify-between gap-2">
          <div>
            <p className="text-[13px] font-semibold text-[#007AFF]">
              {combo.length} ingredient{combo.length === 1 ? '' : 's'}
              {comboTotal ? ` · ${Math.round(comboTotal.calories)} kcal` : ''}
            </p>
            <p className="text-[11px] text-[#8E8E93]">Pick another ingredient, or finish the meal</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={onCancelCombo} className="text-[12px] font-medium text-[#8E8E93] px-2 py-1">Cancel</button>
            <button
              onClick={onFinishCombo}
              disabled={combo.length === 0}
              className="text-[12px] font-semibold text-white bg-[#007AFF] rounded-full px-3 py-1.5 disabled:opacity-40"
            >
              Done
            </button>
          </div>
        </div>
      ) : (
        <div className="px-4 pt-2.5">
          <button onClick={onStartCombo} className="flex items-center gap-1.5 text-[12px] text-[#007AFF] font-medium">
            <Layers size={13} />
            Combine multiple ingredients into one meal
          </button>
        </div>
      )}

      {tab === 'search' && (
        <SearchPanel
          onSelectFood={onSelectFood}
          onScanRequested={onScanRequested}
          barcodeLoading={barcodeLoading}
          barcodeError={barcodeError}
          onDismissBarcodeError={onDismissBarcodeError}
        />
      )}

      {tab === 'quick' && (
        <div className="px-3 pb-3 pt-3">
          <button
            onClick={onNewQuickAdd}
            className="w-full mb-2 flex items-center justify-center gap-2 py-2.5 rounded-2xl border border-[#E5E5EA] text-[#007AFF] text-[13px] font-medium hover:bg-[#F2F2F7] active:opacity-70 transition-colors"
          >
            <PenLine size={14} />
            New quick add
          </button>
          {quickAdds.length === 0 ? (
            <p className="text-[13px] text-[#C7C7CC] text-center py-4">No quick adds yet</p>
          ) : (
            <ul className="divide-y divide-[#F2F2F7]">
              {quickAdds.map(qa => (
                <li key={qa.id} className="flex items-center gap-2">
                  <button
                    onClick={() => onSelectFood(toFoodResult(qa))}
                    className="flex-1 text-left px-1 py-3 hover:bg-[#F9F9F9] active:bg-[#F2F2F7] transition-colors rounded-lg"
                  >
                    <p className="text-[14px] font-medium text-[#1C1C1E] leading-snug line-clamp-1">{qa.name}</p>
                    <p className="text-[12px] text-[#8E8E93] mt-0.5">
                      {qa.quantity}{qa.unit} · {macroPreview(qa)}
                    </p>
                  </button>
                  <button
                    onClick={() => onDeleteQuickAdd(qa.id)}
                    className="p-1.5 rounded-full text-[#C7C7CC] hover:text-[#FF453A] hover:bg-[#FFF0F0] transition-colors shrink-0"
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === 'recent' && (
        <div className="px-3 pb-3 pt-3">
          {recentFoods.length === 0 ? (
            <p className="text-[13px] text-[#C7C7CC] text-center py-4">Nothing logged yet</p>
          ) : (
            <ul className="divide-y divide-[#F2F2F7]">
              {recentFoods.map(rf => (
                <li key={rf.foodName}>
                  <button
                    onClick={() => onSelectFood(toFoodResult(rf))}
                    className="w-full text-left px-1 py-3 hover:bg-[#F9F9F9] active:bg-[#F2F2F7] transition-colors rounded-lg"
                  >
                    <p className="text-[14px] font-medium text-[#1C1C1E] leading-snug line-clamp-1">{rf.foodName}</p>
                    <p className="text-[12px] text-[#8E8E93] mt-0.5">
                      {rf.quantity}{rf.unit} · {macroPreview(rf)}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
