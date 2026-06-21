'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, Plus, X } from 'lucide-react'
import { addFoodEntry } from '@/lib/actions'

interface FoodResult {
  fdcId: number
  description: string
  brandOwner: string | null
  servingSize: number
  servingSizeUnit: string
  calories: number
  proteinG: number
  fatG: number
  carbsG: number
}

interface Props {
  date: string
}

export default function FoodSearch({ date }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<FoodResult[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<FoodResult | null>(null)
  const [quantity, setQuantity] = useState('')
  const [adding, setAdding] = useState(false)
  const [open, setOpen] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResults([]); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/food-search?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setResults(Array.isArray(data) ? data : [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(query), 350)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, search])

  function selectFood(food: FoodResult) {
    setSelected(food)
    setQuantity(String(food.servingSize || 100))
    setResults([])
    setQuery('')
  }

  async function handleAdd() {
    if (!selected || !quantity) return
    const qty = parseFloat(quantity)
    if (isNaN(qty) || qty <= 0) return
    const ratio = qty / (selected.servingSize || 100)
    setAdding(true)
    await addFoodEntry({
      date,
      foodName: selected.description,
      quantity: qty,
      unit: selected.servingSizeUnit || 'g',
      calories: Math.round(selected.calories * ratio * 10) / 10,
      proteinG: Math.round(selected.proteinG * ratio * 10) / 10,
      fatG: Math.round(selected.fatG * ratio * 10) / 10,
      carbsG: Math.round(selected.carbsG * ratio * 10) / 10,
    })
    setSelected(null)
    setQuantity('')
    setOpen(false)
    setAdding(false)
  }

  function dismiss() {
    setOpen(false)
    setSelected(null)
    setQuery('')
    setResults([])
    setQuantity('')
  }

  const qty = parseFloat(quantity) || 0
  const ratio = selected ? qty / (selected.servingSize || 100) : 0

  if (!open) {
    return (
      <button
        onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 50) }}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-[#007AFF] text-white font-semibold text-[15px] active:opacity-80 transition-opacity shadow-sm"
      >
        <Plus size={18} strokeWidth={2.5} />
        Add Food
      </button>
    )
  }

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-[#E5E5EA] overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[#F2F2F7]">
        <Search size={16} className="text-[#8E8E93] shrink-0" />
        <input
          ref={inputRef}
          value={query}
          onChange={e => { setQuery(e.target.value); setSelected(null) }}
          placeholder="Search food..."
          className="flex-1 text-[15px] text-[#1C1C1E] placeholder:text-[#C7C7CC] outline-none bg-transparent"
        />
        <button onClick={dismiss} className="text-[#8E8E93] hover:text-[#1C1C1E] transition-colors">
          <X size={18} />
        </button>
      </div>

      {loading && (
        <div className="px-4 py-3 text-sm text-[#8E8E93]">Searching...</div>
      )}

      {results.length > 0 && !selected && (
        <ul className="divide-y divide-[#F2F2F7] max-h-64 overflow-y-auto">
          {results.map(food => (
            <li key={food.fdcId}>
              <button
                onClick={() => selectFood(food)}
                className="w-full text-left px-4 py-3 hover:bg-[#F9F9F9] transition-colors"
              >
                <p className="text-[14px] font-medium text-[#1C1C1E] leading-snug line-clamp-1">
                  {food.description}
                </p>
                {food.brandOwner && (
                  <p className="text-[12px] text-[#8E8E93] mt-0.5">{food.brandOwner}</p>
                )}
                <p className="text-[12px] text-[#8E8E93] mt-0.5">
                  per {food.servingSize}{food.servingSizeUnit} · {Math.round(food.calories)} kcal · {Math.round(food.proteinG)}g protein
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}

      {selected && (
        <div className="px-4 py-4 space-y-4">
          <div>
            <p className="text-[15px] font-semibold text-[#1C1C1E] leading-snug">{selected.description}</p>
            {selected.brandOwner && (
              <p className="text-[13px] text-[#8E8E93] mt-0.5">{selected.brandOwner}</p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <label className="text-[14px] text-[#6C6C70] shrink-0">Amount ({selected.servingSizeUnit})</label>
            <input
              type="number"
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              min="1"
              className="flex-1 text-right text-[15px] font-semibold text-[#1C1C1E] bg-[#F2F2F7] rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-[#007AFF]/30"
            />
          </div>

          {qty > 0 && (
            <div className="grid grid-cols-4 gap-2 bg-[#F2F2F7] rounded-2xl px-3 py-3">
              {[
                { label: 'Calories', value: Math.round(selected.calories * ratio), unit: 'kcal' },
                { label: 'Protein', value: Math.round(selected.proteinG * ratio * 10) / 10, unit: 'g' },
                { label: 'Carbs', value: Math.round(selected.carbsG * ratio * 10) / 10, unit: 'g' },
                { label: 'Fat', value: Math.round(selected.fatG * ratio * 10) / 10, unit: 'g' },
              ].map(m => (
                <div key={m.label} className="flex flex-col items-center">
                  <span className="text-[13px] font-semibold text-[#1C1C1E]">{m.value}</span>
                  <span className="text-[10px] text-[#8E8E93]">{m.unit}</span>
                  <span className="text-[10px] text-[#8E8E93] mt-0.5">{m.label}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => { setSelected(null); setQuery(''); setQuantity('') }}
              className="flex-1 py-3 rounded-2xl bg-[#F2F2F7] text-[#1C1C1E] font-semibold text-[15px] active:opacity-70 transition-opacity"
            >
              Back
            </button>
            <button
              onClick={handleAdd}
              disabled={adding || qty <= 0}
              className="flex-1 py-3 rounded-2xl bg-[#007AFF] text-white font-semibold text-[15px] active:opacity-80 transition-opacity disabled:opacity-40"
            >
              {adding ? 'Adding...' : 'Add'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
