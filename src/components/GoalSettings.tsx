'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Settings, Check } from 'lucide-react'
import { updateGoals } from '@/lib/actions'
import type { Goals } from '@/lib/schema'

interface Props {
  initialGoals: Goals
}

type GoalKey = 'calories' | 'proteinG' | 'fatG' | 'carbsG'

const FIELDS: { key: GoalKey; label: string; unit: string; color: string }[] = [
  { key: 'calories', label: 'Calories', unit: 'kcal', color: '#007AFF' },
  { key: 'proteinG', label: 'Protein', unit: 'g', color: '#34C759' },
  { key: 'carbsG', label: 'Carbs', unit: 'g', color: '#FF9F0A' },
  { key: 'fatG', label: 'Fat', unit: 'g', color: '#FF453A' },
]

export default function GoalSettings({ initialGoals }: Props) {
  const [open, setOpen] = useState(false)
  const [values, setValues] = useState({
    calories: initialGoals.calories,
    proteinG: initialGoals.proteinG,
    fatG: initialGoals.fatG,
    carbsG: initialGoals.carbsG,
  })
  const [saved, setSaved] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveRef = useRef(values)
  saveRef.current = values

  const save = useCallback(async (vals: typeof values) => {
    await updateGoals(vals)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => save(saveRef.current), 800)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [values, save])

  function handleChange(key: GoalKey, raw: string) {
    const n = parseFloat(raw)
    if (!isNaN(n) && n >= 0) {
      setValues(v => ({ ...v, [key]: n }))
    }
  }

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-[#E5E5EA] overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#F2F2F7] flex items-center justify-center">
            <Settings size={15} className="text-[#6C6C70]" />
          </div>
          <span className="text-[15px] font-semibold text-[#1C1C1E]">Daily Goals</span>
        </div>
        <div className="flex items-center gap-2">
          {saved && (
            <span className="flex items-center gap-1 text-[12px] font-medium text-[#34C759]">
              <Check size={12} strokeWidth={3} /> Saved
            </span>
          )}
          <svg
            viewBox="0 0 24 24"
            className={`w-4 h-4 text-[#C7C7CC] transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" strokeWidth="2.5"
          >
            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-3 border-t border-[#F2F2F7] pt-4">
          <p className="text-[12px] text-[#8E8E93]">Changes save automatically</p>
          {FIELDS.map(({ key, label, unit, color }) => (
            <div key={key} className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
              <label className="text-[14px] text-[#1C1C1E] font-medium w-20 shrink-0">{label}</label>
              <div className="flex-1 flex items-center gap-2 bg-[#F2F2F7] rounded-xl px-3 py-2">
                <input
                  type="number"
                  value={values[key]}
                  onChange={e => handleChange(key, e.target.value)}
                  min="0"
                  className="flex-1 text-[15px] font-semibold text-[#1C1C1E] bg-transparent outline-none text-right w-16"
                />
                <span className="text-[13px] text-[#8E8E93] shrink-0">{unit}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
