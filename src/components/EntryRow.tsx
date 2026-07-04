'use client'

import { useState, useRef } from 'react'
import { Trash2, Pencil, Check, X } from 'lucide-react'
import { deleteFoodEntry, updateFoodEntry } from '@/lib/actions'
import { sanitizeDecimalInput, parseDecimal } from '@/lib/number'
import type { FoodEntry } from '@/lib/schema'

const MACRO_FIELDS = [
  { key: 'calories' as const, label: 'Calories', unit: 'kcal' },
  { key: 'proteinG' as const, label: 'Protein', unit: 'g' },
  { key: 'carbsG' as const, label: 'Carbs', unit: 'g' },
  { key: 'fatG' as const, label: 'Fat', unit: 'g' },
]

function formFromEntry(entry: FoodEntry) {
  return {
    foodName: entry.foodName,
    quantity: String(entry.quantity),
    unit: entry.unit,
    calories: String(entry.calories),
    proteinG: String(entry.proteinG),
    carbsG: String(entry.carbsG),
    fatG: String(entry.fatG),
  }
}

export default function EntryRow({ entry }: { entry: FoodEntry }) {
  const [deleting, setDeleting] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [name, setName] = useState(entry.foodName)
  const [expanded, setExpanded] = useState(false)
  const [form, setForm] = useState(() => formFromEntry(entry))
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleDelete() {
    setDeleting(true)
    await deleteFoodEntry(entry.id)
  }

  function startEditName() {
    setName(entry.foodName)
    setEditingName(true)
    setTimeout(() => inputRef.current?.focus(), 30)
  }

  async function saveName() {
    const trimmed = name.trim()
    if (!trimmed) { setName(entry.foodName); setEditingName(false); return }
    setEditingName(false)
    if (trimmed !== entry.foodName) {
      await updateFoodEntry(entry.id, { foodName: trimmed })
    }
  }

  function toggleExpand() {
    if (!expanded) setForm(formFromEntry(entry))
    setExpanded(e => !e)
  }

  async function handleSave() {
    setSaving(true)
    await updateFoodEntry(entry.id, {
      foodName: form.foodName.trim() || entry.foodName,
      quantity: parseDecimal(form.quantity, entry.quantity),
      unit: form.unit.trim() || entry.unit,
      calories: parseDecimal(form.calories),
      proteinG: parseDecimal(form.proteinG),
      carbsG: parseDecimal(form.carbsG),
      fatG: parseDecimal(form.fatG),
    })
    setSaving(false)
    setExpanded(false)
  }

  return (
    <div className={`py-3 transition-opacity ${deleting ? 'opacity-30' : ''}`}>
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          {editingName ? (
            <input
              ref={inputRef}
              value={name}
              onChange={e => setName(e.target.value)}
              onBlur={saveName}
              onKeyDown={e => {
                if (e.key === 'Enter') saveName()
                if (e.key === 'Escape') { setName(entry.foodName); setEditingName(false) }
              }}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              className="text-[16px] font-medium text-[#1C1C1E] w-full bg-[#F2F2F7] rounded-lg px-2 py-0.5 outline-none focus:ring-2 focus:ring-[#007AFF]/40"
            />
          ) : (
            <button onClick={startEditName} className="text-left w-full group flex items-center gap-1.5">
              <p className="text-[14px] font-medium text-[#1C1C1E] truncate">{entry.foodName}</p>
              <Pencil size={11} className="text-[#C7C7CC] shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          )}
          <p className="text-[12px] text-[#8E8E93] mt-0.5">
            {entry.quantity}{entry.unit} · {Math.round(entry.calories)} kcal
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <div className="flex gap-3">
              <span className="text-[12px] text-[#34C759] font-medium">{Math.round(entry.proteinG)}g P</span>
              <span className="text-[12px] text-[#FF9F0A] font-medium">{Math.round(entry.carbsG)}g C</span>
              <span className="text-[12px] text-[#FF453A] font-medium">{Math.round(entry.fatG)}g F</span>
            </div>
          </div>
          {editingName ? (
            <button onClick={saveName} className="p-1.5 rounded-full text-[#34C759] hover:bg-[#F0FFF4] transition-colors">
              <Check size={14} />
            </button>
          ) : (
            <>
              <button
                onClick={toggleExpand}
                className={`p-1.5 rounded-full transition-colors ${expanded ? 'text-[#007AFF] bg-[#EBF4FF]' : 'text-[#C7C7CC] hover:text-[#007AFF] hover:bg-[#F2F2F7]'}`}
                title="Edit details"
              >
                <Pencil size={14} />
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="p-1.5 rounded-full text-[#C7C7CC] hover:text-[#FF453A] hover:bg-[#FFF0F0] transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </>
          )}
        </div>
      </div>

      {expanded && (
        <div className="mt-3 space-y-3 bg-[#FAFAFA] rounded-2xl px-3 py-3 border border-[#F2F2F7]">
          <input
            value={form.foodName}
            onChange={e => setForm(f => ({ ...f, foodName: e.target.value }))}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            placeholder="Food name"
            className="text-[16px] font-semibold text-[#1C1C1E] w-full bg-white rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-[#007AFF]/30"
          />

          <div className="flex items-center gap-2">
            <div className="flex-1">
              <p className="text-[10px] text-[#8E8E93] mb-1">Quantity</p>
              <input
                type="text"
                inputMode="decimal"
                value={form.quantity}
                onChange={e => setForm(f => ({ ...f, quantity: sanitizeDecimalInput(e.target.value) }))}
                className="w-full text-[16px] font-medium text-[#1C1C1E] bg-white rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-[#007AFF]/30"
              />
            </div>
            <div className="w-16">
              <p className="text-[10px] text-[#8E8E93] mb-1">Unit</p>
              <input
                value={form.unit}
                onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                className="w-full text-[16px] font-medium text-[#1C1C1E] bg-white rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-[#007AFF]/30"
              />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {MACRO_FIELDS.map(m => (
              <div key={m.key} className="flex flex-col items-center gap-0.5">
                <input
                  type="text"
                  inputMode="decimal"
                  value={form[m.key]}
                  onChange={e => setForm(f => ({ ...f, [m.key]: sanitizeDecimalInput(e.target.value) }))}
                  className="w-full text-center text-[16px] font-semibold text-[#1C1C1E] bg-white rounded-xl px-1 py-1.5 outline-none focus:ring-2 focus:ring-[#007AFF]/40 min-w-0"
                />
                <span className="text-[10px] text-[#8E8E93]">{m.unit}</span>
                <span className="text-[10px] text-[#8E8E93]">{m.label}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              onClick={() => setExpanded(false)}
              className="flex items-center gap-1 text-[13px] font-medium text-[#8E8E93] px-3 py-1.5 rounded-full hover:bg-[#F2F2F7] transition-colors"
            >
              <X size={13} /> Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1 text-[13px] font-semibold text-white bg-[#007AFF] px-3 py-1.5 rounded-full disabled:opacity-40"
            >
              <Check size={13} /> {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
