'use client'

import { useState } from 'react'
import { ChevronLeft, X, Minus, Plus, Check, Bookmark } from 'lucide-react'
import { sanitizeDecimalInput, parseDecimal } from '@/lib/number'
import type { FoodResult, ConfirmedItem } from './types'

interface Props {
  food: FoodResult
  onBack: () => void
  onClose: () => void
  onConfirm: (item: ConfirmedItem, opts?: { saveAsQuickAdd?: boolean }) => void
  confirmLabel: string
  confirming?: boolean
  // When true, offers a "save as quick add" toggle alongside logging — so a
  // quick add is created as part of adding the food, not a separate flow.
  showQuickAddOption?: boolean
}

type MacroKey = 'calories' | 'protein' | 'carbs' | 'fat'
type PerGram = Record<MacroKey, number>

function perGramFromFood(food: FoodResult): PerGram {
  const sz = food.servingSize || 100
  return {
    calories: food.calories / sz,
    protein: food.proteinG / sz,
    carbs: food.carbsG / sz,
    fat: food.fatG / sz,
  }
}

function macrosFromPerGram(pg: PerGram, grams: number) {
  return {
    calories: String(Math.round(pg.calories * grams)),
    protein: String(Math.round(pg.protein * grams * 10) / 10),
    carbs: String(Math.round(pg.carbs * grams * 10) / 10),
    fat: String(Math.round(pg.fat * grams * 10) / 10),
  }
}

const MACRO_FIELDS = [
  { key: 'calories' as const, label: 'Calories', unit: 'kcal' },
  { key: 'protein' as const, label: 'Protein', unit: 'g' },
  { key: 'carbs' as const, label: 'Carbs', unit: 'g' },
  { key: 'fat' as const, label: 'Fat', unit: 'g' },
]

// The servings/grams picker + editable macro grid — shared by single-item
// logging, combo-meal ingredient entry, and quick-add creation. It never
// talks to the DB itself; the caller decides what onConfirm means.
export default function DetailEditor({ food, onBack, onClose, onConfirm, confirmLabel, confirming, showQuickAddOption }: Props) {
  const sz = food.servingSize || 100
  const unit = food.servingSizeUnit || 'g'
  const [customName, setCustomName] = useState(food.description)
  const [servings, setServings] = useState(1)
  const [customGrams, setCustomGrams] = useState(String(sz))
  const [useCustomGrams, setUseCustomGrams] = useState(false)
  const [saveAsQuickAdd, setSaveAsQuickAdd] = useState(false)
  const [macrosPerGram, setMacrosPerGram] = useState<PerGram>(() => perGramFromFood(food))
  const [editedMacros, setEditedMacros] = useState(() => macrosFromPerGram(perGramFromFood(food), sz))

  const totalGrams = useCustomGrams ? parseDecimal(customGrams) : servings * sz
  const ratio = useCustomGrams ? totalGrams / sz : servings

  function applyGrams(grams: number) {
    setEditedMacros(macrosFromPerGram(macrosPerGram, grams))
  }

  function handleConfirm() {
    if (ratio <= 0) return
    const foodName = customName.trim() || food.description || 'Custom food'
    onConfirm({
      foodName,
      quantity: Math.round(totalGrams * 10) / 10,
      unit: food.servingSizeUnit || 'g',
      calories: parseDecimal(editedMacros.calories),
      proteinG: parseDecimal(editedMacros.protein),
      fatG: parseDecimal(editedMacros.fat),
      carbsG: parseDecimal(editedMacros.carbs),
    }, { saveAsQuickAdd: showQuickAddOption ? saveAsQuickAdd : false })
  }

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-[#E5E5EA] overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[#F2F2F7]">
        <button onClick={onBack} className="text-[#007AFF] flex items-center gap-0.5 -ml-1">
          <ChevronLeft size={20} strokeWidth={2} />
          <span className="text-[15px]">Back</span>
        </button>
        <div className="flex-1" />
        <button onClick={onClose} className="text-[#8E8E93]"><X size={18} /></button>
      </div>

      <div className="px-4 py-4 space-y-4">
        <div>
          <input
            value={customName}
            onChange={e => setCustomName(e.target.value)}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            className="text-[16px] font-semibold text-[#1C1C1E] w-full bg-transparent outline-none border-b border-transparent focus:border-[#007AFF] pb-0.5 transition-colors"
            placeholder="Product name"
          />
          {food.brandOwner && <p className="text-[13px] text-[#8E8E93] mt-0.5">{food.brandOwner}</p>}
        </div>

        <div className="space-y-3">
          {/* Amount mode — a proper segmented control, not a tiny text link */}
          <div className="flex p-1 bg-[#F2F2F7] rounded-2xl">
            <button
              onClick={() => { setUseCustomGrams(false); applyGrams(servings * sz) }}
              className={`flex-1 py-2 rounded-xl text-[14px] font-semibold transition-colors ${
                !useCustomGrams ? 'bg-white text-[#1C1C1E] shadow-sm' : 'text-[#8E8E93]'
              }`}
            >
              Servings
            </button>
            <button
              onClick={() => { setUseCustomGrams(true); setCustomGrams(String(Math.round(totalGrams))) }}
              className={`flex-1 py-2 rounded-xl text-[14px] font-semibold transition-colors ${
                useCustomGrams ? 'bg-white text-[#1C1C1E] shadow-sm' : 'text-[#8E8E93]'
              }`}
            >
              Amount ({unit})
            </button>
          </div>

          {!useCustomGrams ? (
            <div className="space-y-1.5">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => { const n = Math.max(0.5, parseFloat((servings - 0.5).toFixed(1))); setServings(n); applyGrams(n * sz) }}
                  className="w-12 h-12 rounded-full bg-[#F2F2F7] flex items-center justify-center text-[#1C1C1E] active:opacity-60 transition-opacity"
                  aria-label="Decrease servings"
                >
                  <Minus size={18} strokeWidth={2.5} />
                </button>
                <div className="flex-1 text-center">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={servings}
                    onChange={e => {
                      const v = sanitizeDecimalInput(e.target.value)
                      const n = parseDecimal(v, -1)
                      if (n > 0) { setServings(n); applyGrams(n * sz) }
                    }}
                    className="w-full text-center text-[30px] font-bold text-[#1C1C1E] bg-transparent outline-none focus:bg-[#F2F2F7] rounded-xl transition-colors"
                  />
                  <p className="text-[12px] text-[#8E8E93] mt-0.5">
                    {servings === 1 ? '1 serving' : `${servings} servings`} · {Math.round(totalGrams)}{unit}
                  </p>
                </div>
                <button
                  onClick={() => { const n = parseFloat((servings + 0.5).toFixed(1)); setServings(n); applyGrams(n * sz) }}
                  className="w-12 h-12 rounded-full bg-[#F2F2F7] flex items-center justify-center text-[#1C1C1E] active:opacity-60 transition-opacity"
                  aria-label="Increase servings"
                >
                  <Plus size={18} strokeWidth={2.5} />
                </button>
              </div>
              <p className="text-[12px] text-[#8E8E93] text-center">1 serving = {food.servingSize}{unit}</p>
            </div>
          ) : (
            <div className="relative">
              <input
                autoFocus
                type="text"
                inputMode="decimal"
                value={customGrams}
                onChange={e => {
                  const v = sanitizeDecimalInput(e.target.value)
                  setCustomGrams(v)
                  applyGrams(parseDecimal(v))
                }}
                className="w-full text-center text-[30px] font-bold text-[#1C1C1E] bg-[#F2F2F7] rounded-2xl px-4 py-3 pr-14 outline-none focus:ring-2 focus:ring-[#007AFF]/30"
              />
              <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[16px] font-medium text-[#8E8E93] pointer-events-none">{unit}</span>
            </div>
          )}
        </div>

        {ratio > 0 && (
          <div className="bg-[#F2F2F7] rounded-2xl px-3 py-3">
            <p className="text-[10px] font-medium text-[#8E8E93] uppercase tracking-wide mb-2 text-center">Tap to edit</p>
            <div className="grid grid-cols-4 gap-2">
              {MACRO_FIELDS.map(m => (
                <div key={m.key} className="flex flex-col items-center gap-0.5">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={editedMacros[m.key]}
                    onChange={e => {
                      const v = sanitizeDecimalInput(e.target.value)
                      setEditedMacros(prev => ({ ...prev, [m.key]: v }))
                    }}
                    onBlur={e => {
                      if (totalGrams <= 0) return
                      const v = parseDecimal(e.target.value)
                      setMacrosPerGram(prev => ({ ...prev, [m.key]: v / totalGrams }))
                    }}
                    className="w-full text-center text-[16px] font-semibold text-[#1C1C1E] bg-white rounded-xl px-1 py-1.5 outline-none focus:ring-2 focus:ring-[#007AFF]/40 min-w-0"
                  />
                  <span className="text-[10px] text-[#8E8E93]">{m.unit}</span>
                  <span className="text-[10px] text-[#8E8E93]">{m.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {showQuickAddOption && (
          <button
            type="button"
            onClick={() => setSaveAsQuickAdd(v => !v)}
            aria-pressed={saveAsQuickAdd}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-2xl bg-[#F2F2F7] active:opacity-70 transition-opacity"
          >
            <span className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-colors ${
              saveAsQuickAdd ? 'bg-[#007AFF]' : 'bg-white border border-[#C7C7CC]'
            }`}>
              {saveAsQuickAdd && <Check size={13} strokeWidth={3} className="text-white" />}
            </span>
            <span className="flex items-center gap-1.5 text-[14px] font-medium text-[#1C1C1E]">
              <Bookmark size={14} className="text-[#8E8E93]" />
              Also save as a quick add
            </span>
          </button>
        )}

        <button
          onClick={handleConfirm}
          disabled={confirming || ratio <= 0}
          className="w-full py-3 rounded-2xl bg-[#007AFF] text-white font-semibold text-[15px] active:opacity-80 transition-opacity disabled:opacity-40"
        >
          {confirming ? 'Adding...' : confirmLabel}
        </button>
      </div>
    </div>
  )
}
