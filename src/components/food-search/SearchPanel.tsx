'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, X, Barcode, Camera, PenLine } from 'lucide-react'
import { prepareImageForOcr, nutritionScore, parseNutritionLabel } from '@/lib/ocr'
import type { FoodResult } from './types'

interface Props {
  onSelectFood: (food: FoodResult) => void
  onScanRequested: () => void
  barcodeLoading?: boolean
  barcodeError?: string
  onDismissBarcodeError?: () => void
  // Rendered below the header when the field is empty — the "home" content
  // (quick adds + recents). Search is always reachable from the header, so
  // these no longer live behind a separate tab.
  children?: React.ReactNode
}

export default function SearchPanel({ onSelectFood, onScanRequested, barcodeLoading, barcodeError, onDismissBarcodeError, children }: Props) {
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

  const hasQuery = query.trim().length >= 2
  // The "home" view: no active search, nothing processing. Quick adds, recents
  // and the scan/create shortcuts live here.
  const idle = !hasQuery && !photoLoading && !barcodeLoading

  return (
    <div className="flex flex-col min-h-0 flex-1">
      {/* Persistent search header — search field plus barcode and label-photo
          shortcuts are always reachable, whatever is shown below. Kept outside
          the scroll region below so it never moves while results stream in. */}
      <div className="px-3 pt-3 pb-2.5 flex items-center gap-2 shrink-0">
        <div className="flex-1 flex items-center gap-2 bg-[var(--fill)] rounded-full px-3.5 h-11">
          <Search size={17} className="text-[var(--muted)] shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search foods"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            className="flex-1 min-w-0 text-[16px] text-[var(--ink)] placeholder:text-[var(--muted)] outline-none bg-transparent"
          />
          {query.length > 0 && (
            <button onClick={() => { setQuery(''); setResults([]); setSearchError(false) }} className="text-[var(--muted)] active:opacity-60 shrink-0">
              <X size={17} />
            </button>
          )}
        </div>
        <button
          onClick={onScanRequested}
          className="w-11 h-11 rounded-full bg-[var(--fill)] flex items-center justify-center text-[var(--accent)] active:opacity-60 transition-opacity shrink-0"
          title="Scan barcode"
          aria-label="Scan barcode"
        >
          <Barcode size={20} />
        </button>
        <button
          onClick={() => photoInputRef.current?.click()}
          disabled={photoLoading}
          className="w-11 h-11 rounded-full bg-[var(--fill)] flex items-center justify-center text-[var(--accent)] active:opacity-60 transition-opacity disabled:opacity-40 shrink-0"
          title="Scan nutrition label"
          aria-label="Scan nutrition label"
        >
          <Camera size={20} />
        </button>
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handlePhoto(f) }}
        />
      </div>

      {/* Single scroll region — only this area changes height as you type, so
          the header above stays put. */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
      {/* Transient status / error strips */}
      {photoLoading && (
        <div className="mx-3 mb-3 rounded-2xl border-2 border-dashed border-[var(--accent)] bg-[var(--accent-tint)] flex flex-col items-center justify-center gap-1.5 py-6">
          <Camera size={22} className="text-[var(--accent)] animate-pulse" />
          <p className="text-[13px] font-medium text-[var(--accent)]">Reading nutrition label…</p>
        </div>
      )}

      {barcodeLoading && (
        <div className="px-4 pb-3 text-[13px] text-[var(--muted)] border-t border-[var(--hairline)] pt-3">
          Looking up product…
        </div>
      )}

      {barcodeError && !barcodeLoading && (
        <div className="px-4 pb-3 border-t border-[var(--hairline)] pt-3 flex items-center justify-between">
          <p className="text-[13px] text-[var(--danger)]">{barcodeError}</p>
          <button onClick={onDismissBarcodeError} className="text-[var(--muted)]"><X size={14} /></button>
        </div>
      )}

      {photoError && !photoLoading && (
        <div className="px-4 pb-3 border-t border-[var(--hairline)] pt-3 flex items-center justify-between">
          <p className="text-[13px] text-[var(--danger)]">{photoError}</p>
          <button onClick={() => setPhotoError('')} className="text-[var(--muted)]"><X size={14} /></button>
        </div>
      )}

      {/* Idle "home": scan-label drop zone, create-custom, then quick adds + recents */}
      {idle && (
        <>
          <div
            role="button"
            tabIndex={0}
            aria-label="Scan a nutrition label"
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
            className={`mx-3 mb-2 rounded-2xl border-2 border-dashed flex items-center justify-center gap-2 py-3.5 cursor-pointer select-none transition-colors ${
              zoneDragOver ? 'border-[var(--accent)] bg-[var(--accent-tint)]' : 'border-[var(--border-strong)] active:bg-[var(--fill)]'
            }`}
          >
            <Camera size={18} className={zoneDragOver ? 'text-[var(--accent)]' : 'text-[var(--muted)]'} />
            <p className={`text-[13px] font-medium ${zoneDragOver ? 'text-[var(--accent)]' : 'text-[var(--muted-strong)]'}`}>
              {zoneDragOver ? 'Drop to scan' : 'Scan a nutrition label'}
            </p>
          </div>

          <div className="mx-3 mb-1">
            <button
              onClick={addFromScratch}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl border border-[var(--border)] text-[var(--accent)] text-[13px] font-medium hover:bg-[var(--fill)] active:opacity-70 transition-colors"
            >
              <PenLine size={14} />
              Add custom food
            </button>
          </div>

          {children}
        </>
      )}

      {loading && (
        <div className="px-4 pb-3 text-[13px] text-[var(--muted)] border-t border-[var(--hairline)] pt-3">
          Searching...
        </div>
      )}

      {!loading && !barcodeLoading && results.length > 0 && (
        <ul className="divide-y divide-[var(--hairline)] border-t border-[var(--hairline)]">
          {results.map(food => (
            <li key={food.fdcId}>
              <button
                onClick={() => onSelectFood(food)}
                className="w-full text-left px-4 py-3 hover:bg-[var(--fill-hover)] active:bg-[var(--fill)] transition-colors"
              >
                <p className="text-[14px] font-medium text-[var(--ink)] leading-snug line-clamp-1">{food.description}</p>
                {food.brandOwner && <p className="text-[12px] text-[var(--muted)] mt-0.5">{food.brandOwner}</p>}
                <p className="text-[12px] text-[var(--muted)] mt-0.5">
                  per serving ({food.servingSize}{food.servingSizeUnit}) · {Math.round(food.calories)} kcal · {Math.round(food.proteinG)}g protein
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}

      {!loading && !barcodeLoading && searchError && hasQuery && (
        <div className="px-4 py-4 border-t border-[var(--hairline)] space-y-3">
          <p className="text-[14px] text-[var(--muted)] text-center">Search is temporarily unavailable.</p>
          <button
            onClick={() => search(query)}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl border border-[var(--border)] text-[var(--accent)] text-[13px] font-medium hover:bg-[var(--fill)] active:opacity-70 transition-colors"
          >
            Try again
          </button>
        </div>
      )}

      {!loading && !barcodeLoading && !searchError && hasQuery && results.length === 0 && (
        <div className="px-4 py-4 border-t border-[var(--hairline)] space-y-3">
          <p className="text-[14px] text-[var(--muted)] text-center">No results for &ldquo;{query.trim()}&rdquo;</p>
          <button
            onClick={addFromScratch}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-[var(--accent)] text-white text-[14px] font-semibold active:opacity-80 transition-opacity"
          >
            Add &ldquo;{query.trim()}&rdquo; as custom food
          </button>
        </div>
      )}
      </div>
    </div>
  )
}
