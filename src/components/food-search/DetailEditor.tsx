'use client'

import { useState } from 'react'
import { ChevronLeft, X, Minus, Plus } from 'lucide-react'
import { sanitizeDecimalInput, parseDecimal } from '@/lib/number'
import type { FoodResult, ConfirmedItem } from './types'

interface Props {
  food: FoodResult
  onBack: () => void
  onClose: () => void
  onConfirm: (item: ConfirmedItem) => void
  confirmLabel: string
  confirming?: boolean
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
export default function DetailEditor({ food, onBack, onClose, onConfirm, confirmLabel, confirming }: Props) {
  const sz = food.servingSize || 100
  const [customName, setCustomName] = useState(food.description)
  const [servings, setServings] = useState(1)
  const [customGrams, setCustomGrams] = useState(String(sz))
  const [useCustomGrams, setUseCustomGrams] = useState(false)
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
    })
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

        {!useCustomGrams ? (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[14px] font-medium text-[#6C6C70]">Servings</span>
              <span className="text-[12px] text-[#8E8E93]">1 serving = {food.servingSize}{food.servingSizeUnit}</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => { const n = Math.max(0.5, parseFloat((servings - 0.5).toFixed(1))); setServings(n); applyGrams(n * sz) }}
                className="w-11 h-11 rounded-full bg-[#F2F2F7] flex items-center justify-center text-[#1C1C1E] active:opacity-60 transition-opacity"
              >
                <Minus size={16} strokeWidth={2.5} />
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
                  className="w-full text-center text-[28px] font-bold text-[#1C1C1E] bg-transparent outline-none focus:bg-[#F2F2F7] rounded-xl transition-colors"
                />
                <p className="text-[12px] text-[#8E8E93] mt-0.5">= {Math.round(totalGrams)}{food.servingSizeUnit}</p>
              </div>
              <button
                onClick={() => { const n = parseFloat((servings + 0.5).toFixed(1)); setServings(n); applyGrams(n * sz) }}
                className="w-11 h-11 rounded-full bg-[#F2F2F7] flex items-center justify-center text-[#1C1C1E] active:opacity-60 transition-opacity"
              >
                <Plus size={16} strokeWidth={2.5} />
              </button>
            </div>
            <button
              onClick={() => { setUseCustomGrams(true); setCustomGrams(String(Math.round(totalGrams))) }}
              className="text-[12px] text-[#007AFF]"
            >
              Enter custom amount in grams
            </button>
          </div>
        ) : (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[14px] font-medium text-[#6C6C70]">Amount (g)</span>
              <button onClick={() => { setUseCustomGrams(false); applyGrams(servings * sz) }} className="text-[12px] text-[#007AFF]">Use servings</button>
            </div>
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
              className="w-full text-right text-[22px] font-bold text-[#1C1C1E] bg-[#F2F2F7] rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#007AFF]/30"
            />
          </div>
        )}

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
