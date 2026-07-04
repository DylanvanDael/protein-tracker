'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, X, Scan, Camera, PenLine } from 'lucide-react'
import { prepareImageForOcr, nutritionScore, parseNutritionLabel } from '@/lib/ocr'
import type { FoodResult } from './types'

interface Props {
  onSelectFood: (food: FoodResult) => void
  onScanRequested: () => void
  barcodeLoading?: boolean
  barcodeError?: string
  onDismissBarcodeError?: () => void
}

export default function SearchPanel({ onSelectFood, onScanRequested, barcodeLoading, barcodeError, onDismissBarcodeError }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<FoodResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searchError, setSearchError] = useState(false)
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

  useEffect(() => {
    return () => { abortRef.current?.abort() }
  }, [])

  // Clipboard paste — works on desktop and modern mobile browsers
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const item = Array.from(e.clipboardData?.items ?? []).find(i => i.type.startsWith('image/'))
      const file = item?.getAsFile()
      if (file) handlePhoto(file)
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
      onSelectFood(best)
    } catch {
      setPhotoError('Failed to process image. Please try again.')
    } finally {
      setPhotoLoading(false)
      if (photoInputRef.current) photoInputRef.current.value = ''
    }
  }

  function addFromScratch() {
    onSelectFood({
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

  const showUploadZone = query.length === 0 && !photoLoading && !barcodeLoading && results.length === 0

  return (
    <div>
      {/* Search bar */}
      <div className="flex items-center gap-2 px-4 py-3">
        <Search size={16} className="text-[#8E8E93] shrink-0" />
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search food..."
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          className="flex-1 text-[16px] text-[#1C1C1E] placeholder:text-[#C7C7CC] outline-none bg-transparent"
        />
        <button
          onClick={onScanRequested}
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
        {query.length > 0 && (
          <button onClick={() => { setQuery(''); setResults([]); setSearchError(false) }} className="text-[#8E8E93] hover:text-[#1C1C1E] transition-colors">
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
          <button onClick={onDismissBarcodeError} className="text-[#8E8E93]"><X size={14} /></button>
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
                onClick={() => onSelectFood(food)}
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
