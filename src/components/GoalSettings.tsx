'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Settings, Check } from 'lucide-react'
import { updateGoals } from '@/lib/actions'
import { sanitizeDecimalInput, parseDecimal } from '@/lib/number'
import type { Goals } from '@/lib/schema'

interface Props {
  initialGoals: Goals
}

type GoalKey = 'calories' | 'proteinG' | 'fatG' | 'carbsG'

const FIELDS: { key: GoalKey; label: string; unit: string; color: string }[] = [
  { key: 'calories', label: 'Calories', unit: 'kcal', color: 'var(--accent)' },
  { key: 'proteinG', label: 'Protein', unit: 'g', color: 'var(--green)' },
  { key: 'carbsG', label: 'Carbs', unit: 'g', color: 'var(--orange)' },
  { key: 'fatG', label: 'Fat', unit: 'g', color: 'var(--danger)' },
]

export default function GoalSettings({ initialGoals }: Props) {
  const [open, setOpen] = useState(false)
  const [values, setValues] = useState({
    calories: String(initialGoals.calories),
    proteinG: String(initialGoals.proteinG),
    fatG: String(initialGoals.fatG),
    carbsG: String(initialGoals.carbsG),
  })
  const [saved, setSaved] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveRef = useRef(values)
  saveRef.current = values

  const save = useCallback(async (vals: typeof values) => {
    await updateGoals({
      calories: parseDecimal(vals.calories),
      proteinG: parseDecimal(vals.proteinG),
      fatG: parseDecimal(vals.fatG),
      carbsG: parseDecimal(vals.carbsG),
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => save(saveRef.current), 800)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [values, save])

  function handleChange(key: GoalKey, raw: string) {
    setValues(v => ({ ...v, [key]: sanitizeDecimalInput(raw) }))
  }

  return (
    <div className="bg-[var(--card)] rounded-3xl shadow-sm border border-[var(--border)] overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[var(--fill)] flex items-center justify-center">
            <Settings size={15} className="text-[var(--muted-strong)]" />
          </div>
          <span className="text-[15px] font-semibold text-[var(--ink)]">Daily Goals</span>
        </div>
        <div className="flex items-center gap-2">
          {saved && (
            <span className="flex items-center gap-1 text-[12px] font-medium text-[var(--green)]">
              <Check size={12} strokeWidth={3} /> Saved
            </span>
          )}
          <svg
            viewBox="0 0 24 24"
            className={`w-4 h-4 text-[var(--faint)] transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" strokeWidth="2.5"
          >
            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-3 border-t border-[var(--hairline)] pt-4">
          <p className="text-[12px] text-[var(--muted)]">Changes save automatically</p>
          {FIELDS.map(({ key, label, unit, color }) => (
            <div key={key} className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
              <label className="text-[14px] text-[var(--ink)] font-medium w-20 shrink-0">{label}</label>
              <div className="flex-1 flex items-center gap-2 bg-[var(--fill)] rounded-xl px-3 py-2">
                <input
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  value={values[key]}
                  onChange={e => handleChange(key, e.target.value)}
                  className="flex-1 text-[16px] font-semibold text-[var(--ink)] bg-transparent outline-none text-right w-16"
                />
                <span className="text-[13px] text-[var(--muted)] shrink-0">{unit}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
