'use client'

import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { addFoodEntry, addQuickAdd, deleteQuickAdd, type getRecentFoods } from '@/lib/actions'
import BarcodeScanner from './BarcodeScanner'
import DetailEditor from './food-search/DetailEditor'
import QuickAddsRecents from './food-search/QuickAddsRecents'
import ComboBuilder from './food-search/ComboBuilder'
import { type FoodResult, type ConfirmedItem } from './food-search/types'
import type { QuickAdd } from '@/lib/schema'

type RecentFood = Awaited<ReturnType<typeof getRecentFoods>>[number]

// Single source of truth for which screen renders. `detail` is reused for two
// purposes (single log, one combo ingredient) via the optional `combo`
// accumulator — see handleConfirm below. Saving a quick add is no longer a
// separate screen; it's an option on the log flow (DetailEditor checkbox).
type Mode =
  | { kind: 'closed' }
  | { kind: 'browse'; combo?: ConfirmedItem[] }
  | { kind: 'scanning'; combo?: ConfirmedItem[] }
  | { kind: 'detail'; food: FoodResult; combo?: ConfirmedItem[] }
  | { kind: 'combo-review'; items: ConfirmedItem[] }

interface Props {
  date: string
  initialQuickAdds: QuickAdd[]
  initialRecentFoods: RecentFood[]
}

export default function FoodSearch({ date, initialQuickAdds, initialRecentFoods }: Props) {
  const [mode, setMode] = useState<Mode>({ kind: 'closed' })
  const [adding, setAdding] = useState(false)
  const [barcodeLoading, setBarcodeLoading] = useState(false)
  const [barcodeError, setBarcodeError] = useState('')

  function close() {
    setMode({ kind: 'closed' })
    setBarcodeError('')
    setBarcodeLoading(false)
  }

  function requestClose(combo?: ConfirmedItem[]) {
    if (combo && combo.length > 0 && !window.confirm('Discard the meal you were building?')) return
    close()
  }

  // The sheet renders as a fixed overlay (see below) so it never sits in the
  // page's own scroll flow — otherwise every reflow while typing (results
  // appearing/disappearing) shifts the long page underneath the focused
  // input, and iOS repeatedly re-scrolls to keep it visible above the
  // keyboard, which reads as glitchy auto-scrolling.
  useEffect(() => {
    if (mode.kind === 'closed') return
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = original }
  }, [mode.kind])

  function currentCombo(): ConfirmedItem[] | undefined {
    if (mode.kind === 'combo-review') return mode.items
    if (mode.kind === 'closed') return undefined
    return mode.combo
  }

  async function handleBarcode(code: string, combo?: ConfirmedItem[]) {
    setMode({ kind: 'browse', combo })
    setBarcodeLoading(true)
    setBarcodeError('')
    try {
      const res = await fetch(`/api/barcode?code=${encodeURIComponent(code)}`)
      if (!res.ok) { setBarcodeError('Product not found. Try searching by name.'); return }
      const food: FoodResult = await res.json()
      setMode({ kind: 'detail', food, combo })
    } catch {
      setBarcodeError('Could not look up product. Try searching by name.')
    } finally {
      setBarcodeLoading(false)
    }
  }

  async function handleConfirm(item: ConfirmedItem, opts?: { saveAsQuickAdd?: boolean }) {
    if (mode.kind !== 'detail') return

    // Building a combo meal — collect the ingredient, don't touch the log yet.
    if (mode.combo) {
      setMode({ kind: 'browse', combo: [...mode.combo, item] })
      return
    }

    setAdding(true)
    if (opts?.saveAsQuickAdd) {
      await addQuickAdd({
        name: item.foodName, quantity: item.quantity, unit: item.unit,
        calories: item.calories, proteinG: item.proteinG, fatG: item.fatG, carbsG: item.carbsG,
      })
    }
    await addFoodEntry({
      date, foodName: item.foodName, quantity: item.quantity, unit: item.unit,
      calories: item.calories, proteinG: item.proteinG, fatG: item.fatG, carbsG: item.carbsG,
    })
    setAdding(false)
    close()
  }

  async function handleComboConfirm(items: ConfirmedItem[], name: string) {
    const unit = items[0]?.unit ?? 'g'
    const totals = items.reduce((acc, i) => ({
      quantity: acc.quantity + (i.unit === unit ? i.quantity : 0),
      calories: acc.calories + i.calories,
      proteinG: acc.proteinG + i.proteinG,
      fatG: acc.fatG + i.fatG,
      carbsG: acc.carbsG + i.carbsG,
    }), { quantity: 0, calories: 0, proteinG: 0, fatG: 0, carbsG: 0 })

    setAdding(true)
    await addFoodEntry({
      date,
      foodName: name,
      quantity: Math.round(totals.quantity * 10) / 10,
      unit,
      calories: Math.round(totals.calories * 10) / 10,
      proteinG: Math.round(totals.proteinG * 10) / 10,
      fatG: Math.round(totals.fatG * 10) / 10,
      carbsG: Math.round(totals.carbsG * 10) / 10,
    })
    setAdding(false)
    close()
  }

  if (mode.kind === 'closed') {
    return (
      <button
        onClick={() => setMode({ kind: 'browse' })}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-[#007AFF] text-white font-semibold text-[15px] active:opacity-80 transition-opacity shadow-sm"
      >
        <Plus size={18} strokeWidth={2.5} />
        Add Food
      </button>
    )
  }

  let content
  if (mode.kind === 'scanning') {
    const combo = mode.combo
    content = (
      <div className="space-y-3">
        <BarcodeScanner
          onDetected={code => handleBarcode(code, combo)}
          onClose={() => setMode({ kind: 'browse', combo })}
        />
      </div>
    )
  } else if (mode.kind === 'detail') {
    content = (
      <DetailEditor
        key={mode.food.fdcId}
        food={mode.food}
        onBack={() => setMode({ kind: 'browse', combo: mode.combo })}
        onClose={() => requestClose(mode.combo)}
        onConfirm={handleConfirm}
        confirmLabel={mode.combo ? 'Add Ingredient' : 'Add to Log'}
        showQuickAddOption={!mode.combo}
        confirming={adding}
      />
    )
  } else if (mode.kind === 'combo-review') {
    content = (
      <ComboBuilder
        items={mode.items}
        onRemoveItem={i => setMode({ kind: 'combo-review', items: mode.items.filter((_, idx) => idx !== i) })}
        onBack={() => setMode({ kind: 'browse', combo: mode.items })}
        onCancel={() => requestClose(mode.items)}
        onConfirm={name => handleComboConfirm(mode.items, name)}
        confirming={adding}
      />
    )
  } else {
    // browse
    const combo = mode.combo
    content = (
      <QuickAddsRecents
        quickAdds={initialQuickAdds}
        recentFoods={initialRecentFoods}
        combo={combo}
        onSelectFood={food => setMode({ kind: 'detail', food, combo })}
        onScanRequested={() => setMode({ kind: 'scanning', combo })}
        onDeleteQuickAdd={id => deleteQuickAdd(id)}
        onStartCombo={() => setMode({ kind: 'browse', combo: [] })}
        onFinishCombo={() => { if (combo) setMode({ kind: 'combo-review', items: combo }) }}
        onCancelCombo={() => setMode({ kind: 'browse' })}
        onClose={() => requestClose(combo)}
        barcodeLoading={barcodeLoading}
        barcodeError={barcodeError}
        onDismissBarcodeError={() => setBarcodeError('')}
      />
    )
  }

  // Rendered as a fixed overlay, detached from the page's own scroll flow —
  // see the effect above for why that matters on iOS.
  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center"
      onClick={() => requestClose(currentCombo())}
    >
      <div
        className="w-full sm:max-w-md max-h-[88vh] overflow-y-auto overscroll-contain"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        onClick={e => e.stopPropagation()}
      >
        {content}
      </div>
    </div>
  )
}
