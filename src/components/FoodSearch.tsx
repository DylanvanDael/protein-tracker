'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, Plus, X, Minus, ChevronLeft, Scan, Camera, PenLine } from 'lucide-react'
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
  const [searchError, setSearchError] = useState(false)
  const [selected, setSelected] = useState<FoodResult | null>(null)
  const [customName, setCustomName] = useState('')
  const [servings, setServings] = useState(1)
  const [customGrams, setCustomGrams] = useState('')
  const [useCustomGrams, setUseCustomGrams] = useState(false)
  const [editedMacros, setEditedMacros] = useState({ calories: '0', protein: '0', carbs: '0', fat: '0' })
  const [macrosPerGram, setMacrosPerGram] = useState({ calories: 0, protein: 0, carbs: 0, fat: 0 })
  const [adding, setAdding] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [barcodeError, setBarcodeError] = useState('')
  const [barcodeLoading, setBarcodeLoading] = useState(false)
  const [photoLoading, setPhotoLoading] = useState(false)
  const [photoError, setPhotoError] = useState('')
  const [zoneDragOver, setZoneDragOver] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const search = useCallback(async (q: string) => {
    abortRef.current?.abort()
    if (q.trim().length < 2) { setResults([]); setLoading(false); setSearchError(false); return }
    abortRef.current = new AbortController()
    setLoading(true)
    setSearchError(false)
    setResults([])
    try {
      const res = await fetch(`/api/food-search?q=${encodeURIComponent(q)}`, { signal: abortRef.current.signal })
      const data = await res.json()
      if (!res.ok || !Array.isArray(data)) {
        // Transient upstream failure — surface it as a retryable error instead
        // of an empty result set, which reads as a false "no results".
        setSearchError(true)
        setResults([])
      } else {
        setResults(data)
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') { setSearchError(true); setResults([]) }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(query), 350)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, search])

  // Clipboard paste — works on desktop and modern mobile browsers
  useEffect(() => {
    if (!open) return
    function onPaste(e: ClipboardEvent) {
      const item = Array.from(e.clipboardData?.items ?? []).find(i => i.type.startsWith('image/'))
      const file = item?.getAsFile()
      if (file) handlePhoto(file)
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  function openSearch() {
    setOpen(true)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  function dismiss() {
    abortRef.current?.abort()
    setOpen(false)
    setQuery('')
    setResults([])
    setSearchError(false)
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
      if (!res.ok) { setBarcodeError('Product not found. Try searching by name.'); return }
      const food: FoodResult = await res.json()
      selectFood(food)
    } catch {
      setBarcodeError('Could not look up product. Try searching by name.')
    } finally {
      setBarcodeLoading(false)
    }
  }

  function prepareImageForOcr(file: File): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        // Scale up small images for better OCR, cap large ones to keep it fast
        const TARGET = 1600
        let { width, height } = img
        const scale = Math.min(TARGET / Math.max(width, height), 2) // max 2× upscale
        width = Math.round(width * scale)
        height = Math.round(height * scale)
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')!
        ctx.fillStyle = '#fff'
        ctx.fillRect(0, 0, width, height)
        ctx.drawImage(img, 0, 0, width, height)
        canvas.toBlob(b => b ? resolve(b) : reject(new Error('canvas toBlob failed')), 'image/png')
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
      // OCR runs entirely in the browser — no server, no API key, language data cached after first use
      const blob = await prepareImageForOcr(file)
      const { createWorker, PSM } = await import('tesseract.js')
      const worker = await createWorker(['nld', 'eng'])

      let best: FoodResult | null = null
      for (const psm of [PSM.SPARSE_TEXT, PSM.SINGLE_BLOCK] as const) {
        await worker.setParameters({ tessedit_pageseg_mode: psm })
        const { data: { text } } = await worker.recognize(blob)
        const result = parseNutritionLabel(text)
        if (!best || nutritionScore(result) > nutritionScore(best)) best = result
      }
      await worker.terminate()

      if (!best) {
        setPhotoError('Could not read nutrition label. Try a clearer photo.')
        return
      }
      selectFood(best)
    } catch {
      setPhotoError('Failed to process image. Please try again.')
    } finally {
      setPhotoLoading(false)
      if (photoInputRef.current) photoInputRef.current.value = ''
    }
  }

  function nutritionScore(f: FoodResult | null) {
    if (!f) return 0
    return (f.calories > 0 ? 1 : 0) + (f.proteinG > 0 ? 1 : 0) + (f.fatG > 0 ? 1 : 0) + (f.carbsG > 0 ? 1 : 0)
  }

  function parseNutritionLabel(raw: string): FoodResult | null {
    const fixed = raw
      .replace(/(\d),(\d)/g, '$1.$2')   // Dutch decimal comma
      .replace(/(\d)l(\d)/g, '$1.$2')   // 'l' OCR artifact between digits
      .replace(/(\d)lg/g, '$1.1 g')     // "8lg" → "8.1 g"
      .replace(/(\d)[¢©®°€$]/g, '$1')   // stray noise after digits
    const text = fixed.toLowerCase()
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean)

    // Calories
    let calories = 0
    const kcalM = text.match(/(\d+\.?\d*)\s*kcal/)
    if (kcalM) {
      calories = parseFloat(kcalM[1])
    } else {
      const kjM = text.match(/([\d.]+)\s*kj/)
      if (kjM) calories = Math.round(parseFloat(kjM[1].replace(/\./g, '')) / 4.184)
    }

    // Generic: find grams after a keyword
    function findGrams(keywords: string[]): number {
      for (const kw of keywords) {
        for (let i = 0; i < lines.length; i++) {
          if (!lines[i].includes(kw)) continue
          const m = lines[i].match(/(\d+\.?\d*)\s*g\b/)
          if (m) return parseFloat(m[1])
          if (i + 1 < lines.length) {
            const m2 = lines[i + 1].match(/^(\d+\.?\d*)/)
            if (m2) return parseFloat(m2[1])
          }
        }
      }
      return 0
    }

    const proteinG = findGrams(['eiwitten', 'eiwit', 'protein', 'proteine', 'proteines'])
    const carbsG   = findGrams(['koolhydraten', 'carbohydrates', 'glucides'])

    // Fat: only lines that START with the fat keyword (skip sub-items)
    let fatG = 0
    for (const line of lines) {
      if (/^(vet|fat|fett|lipides?)\b/.test(line)) {
        const m = line.match(/(\d+\.?\d*)\s*g\b/)
        if (m) { fatG = parseFloat(m[1]); break }
      }
    }

    // Calorie-balance correction: if a leading digit was dropped from fat
    if (calories > 0 && fatG > 0) {
      const est = fatG * 9 + (proteinG + carbsG) * 4
      const diff = calories - est
      if (diff > 50 && diff < 200) {
        const corrected = fatG + 10
        if (Math.abs(calories - (corrected * 9 + (proteinG + carbsG) * 4)) < Math.abs(diff)) {
          fatG = corrected
        }
      }
    }

    if (calories === 0 && proteinG === 0 && carbsG === 0) return null

    return {
      fdcId: Date.now(),
      description: 'Scanned Product',
      brandOwner: null,
      servingSize: 100,
      servingSizeUnit: 'g',
      calories: Math.round(calories * 10) / 10,
      proteinG: Math.round(proteinG * 10) / 10,
      fatG: Math.round(fatG * 10) / 10,
      carbsG: Math.round(carbsG * 10) / 10,
    }
  }

  function macrosFromPerGram(pg: typeof macrosPerGram, grams: number) {
    return {
      calories: String(Math.round(pg.calories * grams)),
      protein:  String(Math.round(pg.protein  * grams * 10) / 10),
      carbs:    String(Math.round(pg.carbs    * grams * 10) / 10),
      fat:      String(Math.round(pg.fat      * grams * 10) / 10),
    }
  }

  function selectFood(food: FoodResult) {
    const sz = food.servingSize || 100
    const pg = {
      calories: food.calories / sz,
      protein:  food.proteinG / sz,
      carbs:    food.carbsG   / sz,
      fat:      food.fatG     / sz,
    }
    setSelected(food)
    setCustomName(food.description)
    setServings(1)
    setCustomGrams(String(sz))
    setUseCustomGrams(false)
    setMacrosPerGram(pg)
    setEditedMacros(macrosFromPerGram(pg, sz))
  }

  function addFromScratch() {
    selectFood({
      fdcId: Date.now(),
      description: query.trim(),
      brandOwner: null,
      servingSize: 100,
      servingSizeUnit: 'g',
      calories: 0,
      proteinG: 0,
      fatG: 0,
      carbsG: 0,
    })
  }

  function goBack() {
    setSelected(null)
    setServings(1)
    setUseCustomGrams(false)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const ratio = selected
    ? useCustomGrams ? (parseFloat(customGrams) || 0) / (selected.servingSize || 100) : servings
    : 0

  const totalGrams = selected
    ? useCustomGrams ? parseFloat(customGrams) || 0 : servings * (selected.servingSize || 100)
    : 0

  async function handleAdd() {
    if (!selected || ratio <= 0) return
    const foodName = customName.trim() || selected.description || 'Custom food'
    setAdding(true)
    await addFoodEntry({
      date,
      foodName,
      quantity: Math.round(totalGrams * 10) / 10,
      unit: selected.servingSizeUnit || 'g',
      calories: parseFloat(editedMacros.calories) || 0,
      proteinG: parseFloat(editedMacros.protein)  || 0,
      fatG:     parseFloat(editedMacros.fat)       || 0,
      carbsG:   parseFloat(editedMacros.carbs)     || 0,
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
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#F2F2F7]">
          <button onClick={goBack} className="text-[#007AFF] flex items-center gap-0.5 -ml-1">
            <ChevronLeft size={20} strokeWidth={2} />
            <span className="text-[15px]">Back</span>
          </button>
          <div className="flex-1" />
          <button onClick={dismiss} className="text-[#8E8E93]"><X size={18} /></button>
        </div>

        <div className="px-4 py-4 space-y-4">
          <div>
            <input
              value={customName}
              onChange={e => setCustomName(e.target.value)}
              className="text-[15px] font-semibold text-[#1C1C1E] w-full bg-transparent outline-none border-b border-transparent focus:border-[#007AFF] pb-0.5 transition-colors"
              placeholder="Product name"
            />
            {selected.brandOwner && <p className="text-[13px] text-[#8E8E93] mt-0.5">{selected.brandOwner}</p>}
          </div>

          {!useCustomGrams ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[14px] font-medium text-[#6C6C70]">Servings</span>
                <span className="text-[12px] text-[#8E8E93]">1 serving = {selected.servingSize}{selected.servingSizeUnit}</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => { const n = Math.max(0.5, parseFloat((servings - 0.5).toFixed(1))); setServings(n); setEditedMacros(macrosFromPerGram(macrosPerGram, n * (selected.servingSize || 100))) }}
                  className="w-11 h-11 rounded-full bg-[#F2F2F7] flex items-center justify-center text-[#1C1C1E] active:opacity-60 transition-opacity"
                >
                  <Minus size={16} strokeWidth={2.5} />
                </button>
                <div className="flex-1 text-center">
                  <input
                    type="number"
                    inputMode="decimal"
                    value={servings}
                    onChange={e => {
                      const n = parseFloat(e.target.value)
                      if (!isNaN(n) && n > 0) {
                        setServings(n)
                        setEditedMacros(macrosFromPerGram(macrosPerGram, n * (selected.servingSize || 100)))
                      }
                    }}
                    min="0.1"
                    step="0.1"
                    className="w-full text-center text-[28px] font-bold text-[#1C1C1E] bg-transparent outline-none focus:bg-[#F2F2F7] rounded-xl transition-colors"
                  />
                  <p className="text-[12px] text-[#8E8E93] mt-0.5">= {Math.round(totalGrams)}{selected.servingSizeUnit}</p>
                </div>
                <button
                  onClick={() => { const n = parseFloat((servings + 0.5).toFixed(1)); setServings(n); setEditedMacros(macrosFromPerGram(macrosPerGram, n * (selected.servingSize || 100))) }}
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
                <button onClick={() => { setUseCustomGrams(false); setEditedMacros(macrosFromPerGram(macrosPerGram, servings * (selected.servingSize || 100))) }} className="text-[12px] text-[#007AFF]">Use servings</button>
              </div>
              <input
                autoFocus
                type="number"
                value={customGrams}
                onChange={e => { setCustomGrams(e.target.value); setEditedMacros(macrosFromPerGram(macrosPerGram, parseFloat(e.target.value) || 0)) }}
                min="1"
                className="w-full text-right text-[22px] font-bold text-[#1C1C1E] bg-[#F2F2F7] rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#007AFF]/30"
              />
            </div>
          )}

          {ratio > 0 && (
            <div className="bg-[#F2F2F7] rounded-2xl px-3 py-3">
              <p className="text-[10px] font-medium text-[#8E8E93] uppercase tracking-wide mb-2 text-center">Tap to edit</p>
              <div className="grid grid-cols-4 gap-2">
                {([
                  { key: 'calories' as const, label: 'Calories', unit: 'kcal' },
                  { key: 'protein'  as const, label: 'Protein',  unit: 'g' },
                  { key: 'carbs'    as const, label: 'Carbs',    unit: 'g' },
                  { key: 'fat'      as const, label: 'Fat',      unit: 'g' },
                ]).map(m => (
                  <div key={m.key} className="flex flex-col items-center gap-0.5">
                    <input
                      type="number"
                      inputMode="decimal"
                      value={editedMacros[m.key]}
                      onChange={e => setEditedMacros(prev => ({ ...prev, [m.key]: e.target.value }))}
                      onBlur={e => {
                        if (totalGrams <= 0) return
                        const v = parseFloat(e.target.value) || 0
                        setMacrosPerGram(prev => ({ ...prev, [m.key]: v / totalGrams }))
                      }}
                      className="w-full text-center text-[15px] font-semibold text-[#1C1C1E] bg-white rounded-xl px-1 py-1.5 outline-none focus:ring-2 focus:ring-[#007AFF]/40 min-w-0"
                    />
                    <span className="text-[10px] text-[#8E8E93]">{m.unit}</span>
                    <span className="text-[10px] text-[#8E8E93]">{m.label}</span>
                  </div>
                ))}
              </div>
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
        <BarcodeScanner onDetected={handleBarcode} onClose={() => setScanning(false)} />
      </div>
    )
  }

  // ── Search view ───────────────────────────────────────────────────────────
  const showUploadZone = query.length === 0 && !photoLoading && !barcodeLoading && results.length === 0

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-[#E5E5EA] overflow-hidden">
      {/* Search bar */}
      <div className="flex items-center gap-2 px-4 py-3">
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
        {/* Camera button: visible when typing (no upload zone visible) */}
        {query.length > 0 && (
          <button
            onClick={() => photoInputRef.current?.click()}
            disabled={photoLoading}
            className="p-1.5 rounded-full text-[#8E8E93] hover:text-[#007AFF] hover:bg-[#F2F2F7] transition-colors disabled:opacity-40"
            title="Scan nutrition label"
          >
            <Camera size={18} />
          </button>
        )}
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handlePhoto(f) }}
        />
        {query.length > 0 ? (
          <button onClick={() => { setQuery(''); setResults([]); setSearchError(false) }} className="text-[#8E8E93] hover:text-[#1C1C1E] transition-colors">
            <X size={18} />
          </button>
        ) : (
          <button onClick={dismiss} className="text-[#8E8E93] hover:text-[#1C1C1E] transition-colors">
            <X size={18} />
          </button>
        )}
      </div>

      {/* Add from scratch — always visible in empty state */}
      {showUploadZone && (
        <div className="mx-3 mb-2">
          <button
            onClick={addFromScratch}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl border border-[#E5E5EA] text-[#007AFF] text-[13px] font-medium hover:bg-[#F2F2F7] active:opacity-70 transition-colors"
          >
            <PenLine size={14} />
            Add custom food
          </button>
        </div>
      )}

      {/* Upload zone — tap, drag & drop, or paste */}
      {showUploadZone && (
        <div
          role="button"
          tabIndex={0}
          aria-label="Upload nutrition label photo"
          onClick={() => photoInputRef.current?.click()}
          onKeyDown={e => e.key === 'Enter' && photoInputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setZoneDragOver(true) }}
          onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setZoneDragOver(false) }}
          onDrop={e => {
            e.preventDefault()
            setZoneDragOver(false)
            const file = Array.from(e.dataTransfer.files).find(f => f.type.startsWith('image/'))
            if (file) handlePhoto(file)
          }}
          className={`mx-3 mb-3 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-1.5 py-6 cursor-pointer select-none transition-colors ${
            zoneDragOver ? 'border-[#007AFF] bg-[#EBF4FF]' : 'border-[#D1D1D6] active:bg-[#F2F2F7]'
          }`}
        >
          <Camera size={22} className={zoneDragOver ? 'text-[#007AFF]' : 'text-[#8E8E93]'} />
          <p className={`text-[13px] font-medium ${zoneDragOver ? 'text-[#007AFF]' : 'text-[#8E8E93]'}`}>
            {zoneDragOver ? 'Drop to scan' : 'Tap to scan a nutrition label'}
          </p>
          <p className="text-[11px] text-[#C7C7CC]">or drag & drop · paste from clipboard</p>
        </div>
      )}

      {/* Photo loading */}
      {photoLoading && (
        <div className="mx-3 mb-3 rounded-2xl border-2 border-dashed border-[#007AFF] bg-[#EBF4FF] flex flex-col items-center justify-center gap-1.5 py-6">
          <Camera size={22} className="text-[#007AFF] animate-pulse" />
          <p className="text-[13px] font-medium text-[#007AFF]">Reading nutrition label…</p>
        </div>
      )}

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
                <p className="text-[14px] font-medium text-[#1C1C1E] leading-snug line-clamp-1">{food.description}</p>
                {food.brandOwner && <p className="text-[12px] text-[#8E8E93] mt-0.5">{food.brandOwner}</p>}
                <p className="text-[12px] text-[#8E8E93] mt-0.5">
                  per serving ({food.servingSize}{food.servingSizeUnit}) · {Math.round(food.calories)} kcal · {Math.round(food.proteinG)}g protein
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}

      {!loading && !barcodeLoading && searchError && query.trim().length >= 2 && (
        <div className="px-4 py-4 border-t border-[#F2F2F7] space-y-3">
          <p className="text-[14px] text-[#8E8E93] text-center">Search is temporarily unavailable.</p>
          <button
            onClick={() => search(query)}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl border border-[#E5E5EA] text-[#007AFF] text-[13px] font-medium hover:bg-[#F2F2F7] active:opacity-70 transition-colors"
          >
            Try again
          </button>
        </div>
      )}

      {!loading && !barcodeLoading && !searchError && query.trim().length >= 2 && results.length === 0 && (
        <div className="px-4 py-4 border-t border-[#F2F2F7] space-y-3">
          <p className="text-[14px] text-[#8E8E93] text-center">No results for &ldquo;{query}&rdquo;</p>
          <button
            onClick={addFromScratch}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl border border-[#E5E5EA] text-[#007AFF] text-[13px] font-medium hover:bg-[#F2F2F7] active:opacity-70 transition-colors"
          >
            <PenLine size={14} />
            Add &ldquo;{query}&rdquo; as custom food
          </button>
        </div>
      )}
    </div>
  )
}
