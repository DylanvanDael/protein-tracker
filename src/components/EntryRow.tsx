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
              className="text-[16px] font-medium text-[var(--ink)] w-full bg-[var(--fill)] rounded-lg px-2 py-0.5 outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
            />
          ) : (
            <button onClick={startEditName} className="text-left w-full group flex items-center gap-1.5">
              <p className="text-[14px] font-medium text-[var(--ink)] truncate">{entry.foodName}</p>
              <Pencil size={11} className="text-[var(--faint)] shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          )}
          <p className="text-[12px] text-[var(--muted)] mt-0.5">
            {entry.quantity}{entry.unit} · {Math.round(entry.calories)} kcal
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <div className="flex gap-3">
              <span className="text-[12px] text-[var(--green)] font-medium">{Math.round(entry.proteinG)}g P</span>
              <span className="text-[12px] text-[var(--orange)] font-medium">{Math.round(entry.carbsG)}g C</span>
              <span className="text-[12px] text-[var(--danger)] font-medium">{Math.round(entry.fatG)}g F</span>
            </div>
          </div>
          {editingName ? (
            <button onClick={saveName} className="p-1.5 rounded-full text-[var(--green)] hover:bg-[var(--green-tint)] transition-colors">
              <Check size={14} />
            </button>
          ) : (
            <>
              <button
                onClick={toggleExpand}
                className={`p-1.5 rounded-full transition-colors ${expanded ? 'text-[var(--accent)] bg-[var(--accent-tint)]' : 'text-[var(--faint)] hover:text-[var(--accent)] hover:bg-[var(--fill)]'}`}
                title="Edit details"
              >
                <Pencil size={14} />
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="p-1.5 rounded-full text-[var(--faint)] hover:text-[var(--danger)] hover:bg-[var(--danger-tint)] transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </>
          )}
        </div>
      </div>

      {expanded && (
        <div className="mt-3 space-y-3 bg-[var(--fill-hover)] rounded-2xl px-3 py-3 border border-[var(--hairline)]">
          <input
            value={form.foodName}
            onChange={e => setForm(f => ({ ...f, foodName: e.target.value }))}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            placeholder="Food name"
            className="text-[16px] font-semibold text-[var(--ink)] w-full bg-[var(--elevated)] rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
          />

          <div className="flex items-center gap-2">
            <div className="flex-1">
              <p className="text-[10px] text-[var(--muted)] mb-1">Quantity</p>
              <input
                type="text"
                inputMode="decimal"
                value={form.quantity}
                onChange={e => setForm(f => ({ ...f, quantity: sanitizeDecimalInput(e.target.value) }))}
                className="w-full text-[16px] font-medium text-[var(--ink)] bg-[var(--elevated)] rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
              />
            </div>
            <div className="w-16">
              <p className="text-[10px] text-[var(--muted)] mb-1">Unit</p>
              <input
                value={form.unit}
                onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                className="w-full text-[16px] font-medium text-[var(--ink)] bg-[var(--elevated)] rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
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
                  className="w-full text-center text-[16px] font-semibold text-[var(--ink)] bg-[var(--elevated)] rounded-xl px-1 py-1.5 outline-none focus:ring-2 focus:ring-[var(--accent)]/40 min-w-0"
                />
                <span className="text-[10px] text-[var(--muted)]">{m.unit}</span>
                <span className="text-[10px] text-[var(--muted)]">{m.label}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              onClick={() => setExpanded(false)}
              className="flex items-center gap-1 text-[13px] font-medium text-[var(--muted)] px-3 py-1.5 rounded-full hover:bg-[var(--fill)] transition-colors"
            >
              <X size={13} /> Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1 text-[13px] font-semibold text-white bg-[var(--accent)] px-3 py-1.5 rounded-full disabled:opacity-40"
            >
              <Check size={13} /> {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
