'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, Plus, X, Minus, ChevronLeft, Scan, Camera } from 'lucide-react'
import { addFoodEntry } from '@/lib/actions'
import BarcodeScanner from './BarcodeScanner'

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
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<FoodResult[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<FoodResult | null>(null)
  const [servings, setServings] = useState(1)
  const [customGrams, setCustomGrams] = useState('')
  const [useCustomGrams, setUseCustomGrams] = useState(false)
  const [adding, setAdding] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [barcodeError, setBarcodeError] = useState('')
  const [barcodeLoading, setBarcodeLoading] = useState(false)
  const [photoLoading, setPhotoLoading] = useState(false)
  const [photoError, setPhotoError] = useState('')
  const [dragOver, setDragOver] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const search = useCallback(async (q: string) => {
    abortRef.current?.abort()

    if (q.trim().length < 2) {
      setResults([])
      setLoading(false)
      return
    }

    abortRef.current = new AbortController()
    setLoading(true)
    setResults([]) // clear stale results immediately

    try {
      const res = await fetch(`/api/food-search?q=${encodeURIComponent(q)}`, {
        signal: abortRef.current.signal,
      })
      const data = await res.json()
      setResults(Array.isArray(data) ? data : [])
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(query), 350)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, search])

  function openSearch() {
    setOpen(true)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  function dismiss() {
    abortRef.current?.abort()
    setOpen(false)
    setQuery('')
    setResults([])
    setSelected(null)
    setServings(1)
    setCustomGrams('')
    setUseCustomGrams(false)
    setScanning(false)
    setBarcodeError('')
    setBarcodeLoading(false)
    setPhotoLoading(false)
    setPhotoError('')
  }

  async function handleBarcode(code: string) {
    setScanning(false)
    setBarcodeLoading(true)
    setBarcodeError('')
    try {
      const res = await fetch(`/api/barcode?code=${encodeURIComponent(code)}`)
      if (!res.ok) {
        setBarcodeError('Product not found. Try searching by name.')
        return
      }
      const food: FoodResult = await res.json()
      selectFood(food)
    } catch {
      setBarcodeError('Could not look up product. Try searching by name.')
    } finally {
      setBarcodeLoading(false)
    }
  }

  function compressImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        const maxSize = 800
        let { width, height } = img
        if (width > height && width > maxSize) {
          height = Math.round((height * maxSize) / width)
          width = maxSize
        } else if (height > maxSize) {
          width = Math.round((width * maxSize) / height)
          height = maxSize
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', 0.8).split(',')[1])
        URL.revokeObjectURL(img.src)
      }
      img.onerror = reject
      img.src = URL.createObjectURL(file)
    })
  }

  async function handlePhoto(file: File) {
    setPhotoLoading(true)
    setPhotoError('')
    try {
      const base64 = await compressImage(file)
      const res = await fetch('/api/nutrition-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64, mimeType: 'image/jpeg' }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        setPhotoError(data.error || 'Could not read nutrition label. Try a clearer photo.')
        return
      }
      selectFood(data)
    } catch {
      setPhotoError('Failed to process image. Please try again.')
    } finally {
      setPhotoLoading(false)
      if (photoInputRef.current) photoInputRef.current.value = ''
    }
  }

  function selectFood(food: FoodResult) {
    // Preserve query and results so Back restores them instantly
    setSelected(food)
    setServings(1)
    setCustomGrams(String(food.servingSize || 100))
    setUseCustomGrams(false)
  }

  function goBack() {
    setSelected(null)
    setServings(1)
    setUseCustomGrams(false)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const ratio = selected
    ? useCustomGrams
      ? (parseFloat(customGrams) || 0) / (selected.servingSize || 100)
      : servings
    : 0

  const totalGrams = selected
    ? useCustomGrams
      ? parseFloat(customGrams) || 0
      : servings * (selected.servingSize || 100)
    : 0

  async function handleAdd() {
    if (!selected || ratio <= 0) return
    setAdding(true)
    await addFoodEntry({
      date,
      foodName: selected.description,
      quantity: Math.round(totalGrams * 10) / 10,
      unit: selected.servingSizeUnit || 'g',
      calories: Math.round(selected.calories * ratio * 10) / 10,
      proteinG: Math.round(selected.proteinG * ratio * 10) / 10,
      fatG: Math.round(selected.fatG * ratio * 10) / 10,
      carbsG: Math.round(selected.carbsG * ratio * 10) / 10,
    })
    dismiss()
    setAdding(false)
  }

  if (!open) {
    return (
      <button
        onClick={openSearch}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-[#007AFF] text-white font-semibold text-[15px] active:opacity-80 transition-opacity shadow-sm"
      >
        <Plus size={18} strokeWidth={2.5} />
        Add Food
      </button>
    )
  }

  // ── Detail view ───────────────────────────────────────────────────────────
  if (selected) {
    return (
      <div className="bg-white rounded-3xl shadow-sm border border-[#E5E5EA] overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#F2F2F7]">
          <button onClick={goBack} className="text-[#007AFF] flex items-center gap-0.5 -ml-1">
            <ChevronLeft size={20} strokeWidth={2} />
            <span className="text-[15px]">Back</span>
          </button>
          <div className="flex-1" />
          <button onClick={dismiss} className="text-[#8E8E93]">
            <X size={18} />
          </button>
        </div>

        <div className="px-4 py-4 space-y-4">
          {/* Food name */}
          <div>
            <p className="text-[15px] font-semibold text-[#1C1C1E] leading-snug">{selected.description}</p>
            {selected.brandOwner && (
              <p className="text-[13px] text-[#8E8E93] mt-0.5">{selected.brandOwner}</p>
            )}
          </div>

          {!useCustomGrams ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[14px] font-medium text-[#6C6C70]">Servings</span>
                <span className="text-[12px] text-[#8E8E93]">
                  1 serving = {selected.servingSize}{selected.servingSizeUnit}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setServings(s => Math.max(0.5, parseFloat((s - 0.5).toFixed(1))))}
                  className="w-11 h-11 rounded-full bg-[#F2F2F7] flex items-center justify-center text-[#1C1C1E] active:opacity-60 transition-opacity"
                >
                  <Minus size={16} strokeWidth={2.5} />
                </button>
                <div className="flex-1 text-center">
                  <span className="text-[28px] font-bold text-[#1C1C1E]">{servings}</span>
                  <p className="text-[12px] text-[#8E8E93] mt-0.5">= {Math.round(totalGrams)}{selected.servingSizeUnit}</p>
                </div>
                <button
                  onClick={() => setServings(s => parseFloat((s + 0.5).toFixed(1)))}
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
                <button onClick={() => setUseCustomGrams(false)} className="text-[12px] text-[#007AFF]">
                  Use servings
                </button>
              </div>
              <input
                autoFocus
                type="number"
                value={customGrams}
                onChange={e => setCustomGrams(e.target.value)}
                min="1"
                className="w-full text-right text-[22px] font-bold text-[#1C1C1E] bg-[#F2F2F7] rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#007AFF]/30"
              />
            </div>
          )}

          {ratio > 0 && (
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

          <button
            onClick={handleAdd}
            disabled={adding || ratio <= 0}
            className="w-full py-3 rounded-2xl bg-[#007AFF] text-white font-semibold text-[15px] active:opacity-80 transition-opacity disabled:opacity-40"
          >
            {adding ? 'Adding...' : 'Add to Log'}
          </button>
        </div>
      </div>
    )
  }

  // ── Scanner view ──────────────────────────────────────────────────────────
  if (scanning) {
    return (
      <div className="space-y-3">
        <BarcodeScanner
          onDetected={handleBarcode}
          onClose={() => setScanning(false)}
        />
      </div>
    )
  }

  // ── Search view ───────────────────────────────────────────────────────────
  return (
    <div
      className={`bg-white rounded-3xl shadow-sm border overflow-hidden transition-colors ${dragOver ? 'border-[#007AFF] bg-[#F0F7FF]' : 'border-[#E5E5EA]'}`}
      onDragOver={e => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false) }}
      onDrop={e => {
        e.preventDefault()
        setDragOver(false)
        const file = Array.from(e.dataTransfer.files).find(f => f.type.startsWith('image/'))
        if (file) handlePhoto(file)
      }}
    >
      {dragOver && (
        <div className="px-4 py-6 text-center pointer-events-none">
          <Camera size={24} className="text-[#007AFF] mx-auto mb-1.5" />
          <p className="text-[14px] font-medium text-[#007AFF]">Drop to scan nutrition label</p>
        </div>
      )}

      <div className={`flex items-center gap-2 px-4 py-3 ${dragOver ? 'hidden' : ''}`}>
        <Search size={16} className="text-[#8E8E93] shrink-0" />
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search food..."
          className="flex-1 text-[15px] text-[#1C1C1E] placeholder:text-[#C7C7CC] outline-none bg-transparent"
        />
        <button
          onClick={() => setScanning(true)}
          className="p-1.5 rounded-full text-[#8E8E93] hover:text-[#007AFF] hover:bg-[#F2F2F7] transition-colors"
          title="Scan barcode"
        >
          <Scan size={18} />
        </button>
        <button
          onClick={() => photoInputRef.current?.click()}
          disabled={photoLoading}
          className="p-1.5 rounded-full text-[#8E8E93] hover:text-[#007AFF] hover:bg-[#F2F2F7] transition-colors disabled:opacity-40"
          title="Scan nutrition label"
        >
          <Camera size={18} />
        </button>
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handlePhoto(f) }}
        />
        {query.length > 0 ? (
          <button
            onClick={() => { setQuery(''); setResults([]) }}
            className="text-[#8E8E93] hover:text-[#1C1C1E] transition-colors"
          >
            <X size={18} />
          </button>
        ) : (
          <button onClick={dismiss} className="text-[#8E8E93] hover:text-[#1C1C1E] transition-colors">
            <X size={18} />
          </button>
        )}
      </div>

      {barcodeLoading && (
        <div className="px-4 pb-3 text-[13px] text-[#8E8E93] border-t border-[#F2F2F7] pt-3">
          Looking up product…
        </div>
      )}

      {barcodeError && !barcodeLoading && (
        <div className="px-4 pb-3 border-t border-[#F2F2F7] pt-3 flex items-center justify-between">
          <p className="text-[13px] text-[#FF453A]">{barcodeError}</p>
          <button onClick={() => setBarcodeError('')} className="text-[#8E8E93]"><X size={14} /></button>
        </div>
      )}

      {photoLoading && (
        <div className="px-4 pb-3 text-[13px] text-[#8E8E93] border-t border-[#F2F2F7] pt-3">
          Reading nutrition label…
        </div>
      )}

      {photoError && !photoLoading && (
        <div className="px-4 pb-3 border-t border-[#F2F2F7] pt-3 flex items-center justify-between">
          <p className="text-[13px] text-[#FF453A]">{photoError}</p>
          <button onClick={() => setPhotoError('')} className="text-[#8E8E93]"><X size={14} /></button>
        </div>
      )}

      {loading && (
        <div className="px-4 pb-3 text-[13px] text-[#8E8E93] border-t border-[#F2F2F7] pt-3">
          Searching...
        </div>
      )}

      {!loading && !barcodeLoading && results.length > 0 && (
        <ul className="divide-y divide-[#F2F2F7] max-h-72 overflow-y-auto border-t border-[#F2F2F7]">
          {results.map(food => (
            <li key={food.fdcId}>
              <button
                onClick={() => selectFood(food)}
                className="w-full text-left px-4 py-3 hover:bg-[#F9F9F9] active:bg-[#F2F2F7] transition-colors"
              >
                <p className="text-[14px] font-medium text-[#1C1C1E] leading-snug line-clamp-1">
                  {food.description}
                </p>
                {food.brandOwner && (
                  <p className="text-[12px] text-[#8E8E93] mt-0.5">{food.brandOwner}</p>
                )}
                <p className="text-[12px] text-[#8E8E93] mt-0.5">
                  per serving ({food.servingSize}{food.servingSizeUnit}) · {Math.round(food.calories)} kcal · {Math.round(food.proteinG)}g protein
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}

      {!loading && !barcodeLoading && query.trim().length >= 2 && results.length === 0 && (
        <div className="px-4 py-4 text-[14px] text-[#8E8E93] text-center border-t border-[#F2F2F7]">
          No results for &ldquo;{query}&rdquo;
        </div>
      )}
    </div>
  )
}
