'use client'

import { X, Trash2, Layers } from 'lucide-react'
import SearchPanel from './SearchPanel'
import { toFoodResult, type FoodResult, type ConfirmedItem } from './types'
import type { QuickAdd } from '@/lib/schema'
import type { getRecentFoods } from '@/lib/actions'

type RecentFood = Awaited<ReturnType<typeof getRecentFoods>>[number]

interface Props {
  quickAdds: QuickAdd[]
  recentFoods: RecentFood[]
  combo?: ConfirmedItem[]
  onSelectFood: (food: FoodResult) => void
  onScanRequested: () => void
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
  onSelectFood, onScanRequested, onDeleteQuickAdd,
  onStartCombo, onFinishCombo, onCancelCombo, onClose,
  barcodeLoading, barcodeError, onDismissBarcodeError,
}: Props) {
  const comboTotal = combo?.reduce((acc, i) => ({
    calories: acc.calories + i.calories,
    proteinG: acc.proteinG + i.proteinG,
  }), { calories: 0, proteinG: 0 })

  return (
    // Fixed height so the search header never shifts as results appear or
    // disappear while typing — only the inner scroll region changes size.
    <div className="bg-[var(--card)] rounded-3xl shadow-sm border border-[var(--border)] overflow-hidden flex flex-col h-[80dvh]">
      {/* Title row */}
      <div className="flex items-center px-4 pt-3.5 pb-1 shrink-0">
        <h2 className="text-[17px] font-semibold text-[var(--ink)]">Add food</h2>
        <div className="flex-1" />
        <button onClick={onClose} className="text-[var(--muted)] p-1 active:opacity-60" aria-label="Close">
          <X size={20} />
        </button>
      </div>

      {/* Active meal banner — only while a combo is being built */}
      {combo && (
        <div className="mx-3 mt-1 px-3 py-2.5 rounded-2xl bg-[var(--accent-tint)] flex items-center justify-between gap-2 shrink-0">
          <div>
            <p className="text-[13px] font-semibold text-[var(--accent)]">
              {combo.length} ingredient{combo.length === 1 ? '' : 's'}
              {comboTotal ? ` · ${Math.round(comboTotal.calories)} kcal` : ''}
            </p>
            <p className="text-[11px] text-[var(--muted)]">Pick another ingredient, or finish the meal</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={onCancelCombo} className="text-[12px] font-medium text-[var(--muted)] px-2 py-1">Cancel</button>
            <button
              onClick={onFinishCombo}
              disabled={combo.length === 0}
              className="text-[12px] font-semibold text-white bg-[var(--accent)] rounded-full px-3 py-1.5 disabled:opacity-40"
            >
              Done
            </button>
          </div>
        </div>
      )}

      <SearchPanel
        onSelectFood={onSelectFood}
        onScanRequested={onScanRequested}
        barcodeLoading={barcodeLoading}
        barcodeError={barcodeError}
        onDismissBarcodeError={onDismissBarcodeError}
      >
        {/* Idle "home" content — quick adds and recents, always a tap away
            because the search header sits above this. */}
        <div className="px-3 pb-3 pt-1">
          {/* Quick Adds */}
          <p className="text-[12px] font-semibold text-[var(--muted)] uppercase tracking-wide px-1 pt-2 pb-1">Quick Adds</p>
          {quickAdds.length === 0 ? (
            <p className="text-[13px] text-[var(--faint)] py-3 px-1">
              No quick adds yet — tick &ldquo;save as a quick add&rdquo; when you log a food.
            </p>
          ) : (
            <ul className="divide-y divide-[var(--hairline)]">
              {quickAdds.map(qa => (
                <li key={qa.id} className="flex items-center gap-2">
                  <button
                    onClick={() => onSelectFood(toFoodResult(qa))}
                    className="flex-1 text-left px-1 py-3 hover:bg-[var(--fill-hover)] active:bg-[var(--fill)] transition-colors rounded-lg"
                  >
                    <p className="text-[14px] font-medium text-[var(--ink)] leading-snug line-clamp-1">{qa.name}</p>
                    <p className="text-[12px] text-[var(--muted)] mt-0.5">
                      {qa.quantity}{qa.unit} · {macroPreview(qa)}
                    </p>
                  </button>
                  <button
                    onClick={() => onDeleteQuickAdd(qa.id)}
                    className="p-1.5 rounded-full text-[var(--faint)] hover:text-[var(--danger)] hover:bg-[var(--danger-tint)] transition-colors shrink-0"
                    aria-label={`Delete ${qa.name}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* Recents */}
          <p className="text-[12px] font-semibold text-[var(--muted)] uppercase tracking-wide px-1 pt-4 pb-1">Recents</p>
          {recentFoods.length === 0 ? (
            <p className="text-[13px] text-[var(--faint)] py-3 px-1">Nothing logged yet.</p>
          ) : (
            <ul className="divide-y divide-[var(--hairline)]">
              {recentFoods.map(rf => (
                <li key={rf.foodName}>
                  <button
                    onClick={() => onSelectFood(toFoodResult(rf))}
                    className="w-full text-left px-1 py-3 hover:bg-[var(--fill-hover)] active:bg-[var(--fill)] transition-colors rounded-lg"
                  >
                    <p className="text-[14px] font-medium text-[var(--ink)] leading-snug line-clamp-1">{rf.foodName}</p>
                    <p className="text-[12px] text-[var(--muted)] mt-0.5">
                      {rf.quantity}{rf.unit} · {macroPreview(rf)}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </SearchPanel>

      {/* Build-a-meal entry point — a footer action, out of the way of search,
          shown only when a meal isn't already being built. */}
      {!combo && (
        <div className="shrink-0 border-t border-[var(--hairline)] px-3 py-2.5" style={{ paddingBottom: 'max(10px, env(safe-area-inset-bottom))' }}>
          <button
            onClick={onStartCombo}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-[var(--fill)] text-[var(--accent)] text-[13px] font-semibold active:opacity-70 transition-opacity"
          >
            <Layers size={15} />
            Build a meal from multiple ingredients
          </button>
        </div>
      )}
    </div>
  )
}
